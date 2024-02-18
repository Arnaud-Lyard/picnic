import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { CookieOptions, NextFunction, Request, Response } from 'express';
import {
  checkIfEmailExist,
  createUser,
  findByEmail,
  findUserByPasswordResetToken,
  findUserByVerificationCode,
  signTokens,
  switchVerificationCode,
  updateResetPasswordToken,
  updateUserPassword,
  verifyUser,
} from '../../user/service/user.service';
import AppError from '../../utils/appError';
import Email from '../../utils/email';
import {
  ForgotPasswordInput,
  LoginUserInput,
  RegisterUserInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '../schema/auth.schema';

const cookiesOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
};

if (process.env.NODE_ENV === 'production') cookiesOptions.secure = true;

const accessTokenCookieOptions: CookieOptions = {
  ...cookiesOptions,
  expires: new Date(
    Date.now() + Number(process.env.ACCESS_TOKEN_EXPIRES_IN) * 60 * 1000
  ),
  maxAge: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) * 60 * 1000,
};

export const registerUserHandler = async (
  req: Request<{}, {}, RegisterUserInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const isEmailExist = await checkIfEmailExist(req.body.email);
    if (isEmailExist !== null) {
      return res.status(409).json({
        status: 'fail',
        message: 'Email already exist, please use another email address',
      });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 12);

    const verifyCode = crypto.randomBytes(32).toString('hex');
    const verificationCode = crypto
      .createHash('sha256')
      .update(verifyCode)
      .digest('hex');

    const user = await createUser({
      pseudo: req.body.pseudo,
      email: req.body.email.toLowerCase(),
      password: hashedPassword,
      verificationCode,
    });

    const redirectUrl = `${process.env.CLIENT_URL}/verification-email/${verifyCode}`;

    try {
      const mail = await new Email(user, redirectUrl).sendVerificationCode();

      await switchVerificationCode({ userId: user.id, verificationCode });

      res.status(201).json({
        status: 'success',
        message:
          'An email with a verification code has been sent to your email',
      });
    } catch (error) {
      await switchVerificationCode({ userId: user.id, verificationCode: null });
      return res.status(500).json({
        status: 'error',
        message: 'There was an error sending email, please try again',
      });
    }
  } catch (err: any) {
    next(err);
  }
};

export const loginUserHandler = async (
  req: Request<{}, {}, LoginUserInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const user = await findByEmail(email.toLowerCase());

    if (!user) {
      return next(new AppError(400, 'Invalid email or password'));
    }

    // Check if user is verified
    if (!user.verified) {
      return next(
        new AppError(
          401,
          'You are not verified, please verify your email to login'
        )
      );
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError(400, 'Invalid email or password'));
    }

    // Sign Tokens
    const { access_token } = await signTokens(user);
    res.cookie('access_token', access_token, accessTokenCookieOptions);
    res.cookie('logged_in', true, {
      ...accessTokenCookieOptions,
      httpOnly: false,
    });

    res.status(200).json({
      status: 'success',
      access_token,
    });
  } catch (err: any) {
    next(err);
  }
};

function logout(res: Response) {
  res.cookie('access_token', '', { maxAge: 1 });
  res.cookie('logged_in', '', { maxAge: 1 });
}

export const logoutUserHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logout(res);

    res.status(200).json({
      status: 'success',
    });
  } catch (err: any) {
    next(err);
  }
};

export const verifyEmailHandler = async (
  req: Request<VerifyEmailInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const verificationCode = crypto
      .createHash('sha256')
      .update(req.params.verificationCode)
      .digest('hex');

    const user = await findUserByVerificationCode(verificationCode);
    if (!user) {
      return next(new AppError(401, 'Could not verify email'));
    }
    await verifyUser(user.id);

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully',
    });
  } catch (err: any) {
    next(err);
  }
};

export const forgotPasswordHandler = async (
  req: Request<
    Record<string, never>,
    Record<string, never>,
    ForgotPasswordInput
  >,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the user from the collection
    const user = await findByEmail(req.body.email.toLowerCase());
    const message =
      'You will receive a reset email if user with that email exist';
    if (!user) {
      return res.status(200).json({
        status: 'success',
        message,
      });
    }

    if (!user.verified) {
      return res.status(403).json({
        status: 'fail',
        message: 'Account not verified',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    await updateResetPasswordToken({
      userId: user.id,
      passwordResetToken,
      passwordResetAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    try {
      const url = `${process.env.CLIENT_URL}/password/reset/${resetToken}`;
      await new Email(user, url).sendPasswordResetToken();

      res.status(200).json({
        status: 'success',
        message,
      });
    } catch (err: any) {
      await updateResetPasswordToken({
        userId: user.id,
        passwordResetToken: null,
        passwordResetAt: null,
      });
      return res.status(500).json({
        status: 'error',
        message: 'There was an error sending email',
      });
    }
  } catch (err: any) {
    next(err);
  }
};

export const resetPasswordHandler = async (
  req: Request<
    ResetPasswordInput['params'],
    Record<string, never>,
    ResetPasswordInput['body']
  >,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.body.password !== req.body.passwordConfirm) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password and confirm password does not match',
      });
    }
    // Get the user from the collection
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const user = await findUserByPasswordResetToken({
      passwordResetToken,
    });

    if (!user) {
      return res.status(403).json({
        status: 'fail',
        message: 'Invalid token or token has expired',
      });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    // Change password data
    await updateUserPassword({
      userId: user.id,
      hashedPassword,
      passwordResetToken: null,
      passwordResetAt: null,
    });

    logout(res);
    res.status(200).json({
      status: 'success',
      message: 'Password data updated successfully',
    });
  } catch (err: any) {
    next(err);
  }
};

export const loginAdminHandler = async (
  req: Request<{}, {}, LoginUserInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const user = await findByEmail(email.toLowerCase());

    if (!user) {
      return next(new AppError(400, 'Invalid email or password'));
    }

    if (user.role === 'user' || user.role !== 'admin') {
      return next(new AppError(401, `You are not authorized to access`));
    }

    // Check if user is verified
    if (!user.verified) {
      return next(
        new AppError(
          401,
          'You are not verified, please verify your email to login'
        )
      );
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError(400, 'Invalid email or password'));
    }

    // Sign Tokens
    const { access_token } = await signTokens(user);
    res.cookie('access_token', access_token, accessTokenCookieOptions);
    res.cookie('logged_in', true, {
      ...accessTokenCookieOptions,
      httpOnly: false,
    });

    res.status(200).json({
      status: 'success',
      access_token,
    });
  } catch (err: any) {
    next(err);
  }
};

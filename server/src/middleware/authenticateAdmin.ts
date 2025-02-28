import { NextFunction, Request, Response } from 'express';
import { userService } from '../user/user.service';
import AppError from '../utils/appError';
import { verifyJwt } from '../utils/jwt';

export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let access_token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      access_token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.access_token) {
      access_token = req.cookies.access_token;
    }

    if (!access_token) {
      return next(new AppError(401, 'You are not logged in'));
    }

    // Validate the access token
    const decoded = verifyJwt<{ sub: string }>(access_token);

    if (!decoded) {
      return next(new AppError(401, `Invalid token or user doesn't exist`));
    }

    // Check if the user still exist
    const user = await userService.findUniqueUser(decoded.sub);

    if (!user) {
      return next(new AppError(401, `Invalid token or session has expired`));
    }

    if (user.role !== 'admin') {
      return next(new AppError(401, `You are not authorized to access`));
    }

    next();
  } catch (err: any) {
    next(err);
  }
};

import { IUser } from '../../types/user';
import { PostRepository } from '../repository/post.repository';
import { File } from '../../types/file';
import { PostStatusEnumType } from '@prisma/client';
import { IPostUpdateDto } from '../dto/post.dto';
import { removeExistingImages } from '../../utils/removeExistingImages';
import AppError from '../../utils/appError';
import { UserRepository } from '../../user/repository/user.repository';

export async function addPost({
  user,
  frenchContent,
  englishContent,
  frenchTitle,
  englishTitle,
  frenchDescription,
  englishDescription,
  slug,
  categoryIds,
  image,
}: {
  user: IUser;
  frenchContent: string;
  englishContent: string;
  frenchTitle: string;
  englishTitle: string;
  frenchDescription: string;
  englishDescription: string;
  slug: string;
  categoryIds: string[];
  image: File | undefined;
}) {
  try {
    const users = await UserRepository.findAll();
    return await PostRepository.create({
      user,
      frenchContent,
      englishContent,
      frenchDescription,
      englishDescription,
      frenchTitle,
      englishTitle,
      slug,
      categoryIds,
      image: image!.filename,
      users,
    });
  } catch (err: any) {
    throw new AppError(400, 'Error while creating post.');
  }
}

export async function addCategory({ name }: { name: string }) {
  return await PostRepository.createCategory({
    name,
  });
}

export async function getAllCategories() {
  return await PostRepository.getAllCategories();
}

export async function getAllPosts() {
  return await PostRepository.getAllPosts();
}

export async function checkIfPostExist(id: string) {
  return await PostRepository.getPostById(id);
}

export async function changePostStatus({
  id,
  status,
}: {
  id: string;
  status: PostStatusEnumType;
}) {
  return await PostRepository.changeStatusByPostId({
    id,
    status,
  });
}

export async function getPost(id: string) {
  return await PostRepository.getPostById(id);
}

export async function editPost({
  user,
  id,
  frenchContent,
  englishContent,
  frenchTitle,
  englishTitle,
  frenchDescription,
  englishDescription,
  slug,
  categoryIds,
  image,
}: {
  user: IUser;
  id: string;
  frenchContent: string;
  englishContent: string;
  frenchTitle: string;
  englishTitle: string;
  frenchDescription: string;
  englishDescription: string;
  slug: string;
  categoryIds: string[];
  image: File | undefined;
}) {
  const postUpdate: IPostUpdateDto = {
    id,
    frenchContent,
    englishContent,
    frenchTitle,
    englishTitle,
    frenchDescription,
    englishDescription,
    slug,
    categoryIds,
    image: null,
  };

  try {
    const postHasImage = await PostRepository.findByPostId(id);

    if (!image && postHasImage!.image) {
      postUpdate.image = postHasImage!.image;
    }

    if (image && postHasImage!.image) {
      postUpdate.image = image.filename;
      await removeExistingImages({
        filename: postHasImage!.image,
        environment: process.env.NODE_ENV,
      });
    }
    await PostRepository.updatePost(postUpdate);
  } catch (err: any) {
    throw new AppError(400, 'Error while updating post.');
  }
}

export async function getPublishPosts() {
  return await PostRepository.getPublishPosts();
}

export async function getPostBySlug(slug: string) {
  return await PostRepository.getPostBySlug(slug);
}

export async function getNewPosts({ user }: { user: IUser }) {
  return await PostRepository.getNewPosts({ user });
}

export async function resetNewPosts({ user }: { user: IUser }) {
  const posts = await PostRepository.findAll();
  return await PostRepository.resetNewPosts({ posts, user });
}

export async function addComment({
  user,
  postId,
  comment,
}: {
  user: IUser;
  postId: string;
  comment: string;
}) {
  return await PostRepository.addComment({
    user,
    postId,
    comment,
  });
}

export async function getComment(postId: string) {
  return await PostRepository.getComment(postId);
}

export async function addResponse({
  user,
  postId,
  comment,
  parentId,
}: {
  user: IUser;
  postId: string;
  comment: string;
  parentId: string;
}) {
  return await PostRepository.addResponse({
    user,
    postId,
    comment,
    parentId,
  });
}

export async function getNewComment({ user }: { user: IUser }) {
  return await PostRepository.getNewComment({ user });
}

export async function resetNewComment({ user }: { user: IUser }) {
  return await PostRepository.resetNewComment({ user });
}

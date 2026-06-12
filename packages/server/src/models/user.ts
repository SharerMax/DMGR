import type { User } from '@prisma/client'
import { prisma } from '../db/index.js'

export type { User }

export interface CreateUserInput {
  username: string
  password: string
  email?: string
}

export async function createUser(input: CreateUserInput): Promise<User> {
  return prisma.user.create({
    data: {
      username: input.username,
      password: input.password,
      email: input.email,
    },
  })
}

export async function getUserById(id: number): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  })
}

export async function getUserByUsername(username: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { username },
  })
}

export async function updateUser(
  id: number,
  input: Partial<Pick<User, 'email' | 'password'>>,
): Promise<User | null> {
  return prisma.user.update({
    where: { id },
    data: input,
  })
}

export async function deleteUser(id: number): Promise<boolean> {
  try {
    await prisma.user.delete({
      where: { id },
    })
    return true
  }
  catch {
    return false
  }
}

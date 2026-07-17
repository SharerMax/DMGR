import type { Provider } from '../prisma/generated/client'
import { prisma } from '../db/index.js'

export type { Provider }

export interface CreateProviderInput {
  type: string
  name: string
  config: Record<string, string>
  userId: number
}

export async function createProvider(input: CreateProviderInput): Promise<Provider> {
  return prisma.provider.create({
    data: {
      type: input.type,
      name: input.name,
      config: JSON.stringify(input.config),
      userId: input.userId,
    },
  })
}

export async function getProviderById(id: number): Promise<Provider | null> {
  return prisma.provider.findUnique({
    where: { id },
  })
}

export async function getProvidersByUserId(userId: number): Promise<Provider[]> {
  return prisma.provider.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateProvider(
  id: number,
  input: Partial<Omit<Provider, 'id' | 'userId' | 'createdAt'>>,
): Promise<Provider | null> {
  const updateData: any = {
    name: input.name,
  }

  if (input.config !== undefined) {
    updateData.config = typeof input.config === 'string' ? input.config : JSON.stringify(input.config)
  }

  if (input.type !== undefined) {
    updateData.type = input.type
  }

  return prisma.provider.update({
    where: { id },
    data: updateData,
  })
}

export async function deleteProvider(id: number): Promise<boolean> {
  try {
    await prisma.provider.delete({
      where: { id },
    })
    return true
  }
  catch {
    return false
  }
}

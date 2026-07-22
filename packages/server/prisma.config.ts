import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx src/prisma/seed.ts',
    path: 'prisma/migrations',
  },
  datasource: {
    url: 'file:./prisma/dev.db',
  },
})

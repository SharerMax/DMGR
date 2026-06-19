import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'src/prisma/schema.prisma',
  migrations: {
    seed: 'tsx src/prisma/seed.ts',
    path: 'src/prisma/migrations',
  },
  datasource: {
    url: 'file:./prisma/dev.db',
  },
})

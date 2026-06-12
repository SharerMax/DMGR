import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'src/prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
    path: 'prisma/migrations',
  },
  datasource: {
    url: 'file:./prisma/dev.db',
  },
})

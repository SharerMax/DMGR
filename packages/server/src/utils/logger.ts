import { mkdirSync } from 'fs'
import pino from 'pino'
import { createStream } from 'rotating-file-stream'

const isDev = process.env.NODE_ENV !== 'production'

const logDir = process.env.LOG_DIR || './logs'
mkdirSync(logDir, { recursive: true })

const createLogStream = () => {
  return createStream('app.log', {
    interval: '1d',
    size: '10M',
    maxFiles: 30,
    path: logDir,
    compress: 'gzip',
  })
}

export const logger = isDev
  ? pino({
      level: process.env.LOG_LEVEL || 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    })
  : pino(
      {
        level: process.env.LOG_LEVEL || 'info',
      },
      createLogStream(),
    )

export default logger

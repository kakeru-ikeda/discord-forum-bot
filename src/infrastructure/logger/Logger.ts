import * as winston from 'winston';
import { ILoggingConfig } from '../config/ConfigManager';

export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug'
}

export interface ILogger {
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}

export class Logger implements ILogger {
    private readonly logger: winston.Logger;

    constructor(private readonly config: ILoggingConfig) {
        this.logger = this.createLogger();
    }

    private createLogger(): winston.Logger {
        const transports: winston.transport[] = [
            new winston.transports.Console({
                level: this.config.level,
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.timestamp(),
                    winston.format.printf(({ timestamp, level, message, ...meta }) => {
                        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
                            }`;
                    })
                ),
            }),
        ];

        if (this.config.enableFileLogging) {
            transports.push(
                new winston.transports.File({
                    filename: this.config.logFilePath,
                    level: this.config.level,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    ),
                })
            );
        }

        return winston.createLogger({
            level: this.config.level,
            transports,
            exceptionHandlers: [
                new winston.transports.Console(),
                ...(this.config.enableFileLogging
                    ? [new winston.transports.File({ filename: this.config.logFilePath })]
                    : [])
            ],
            rejectionHandlers: [
                new winston.transports.Console(),
                ...(this.config.enableFileLogging
                    ? [new winston.transports.File({ filename: this.config.logFilePath })]
                    : [])
            ],
        });
    }

    public error(message: string, meta?: any): void {
        this.logger.error(message, meta);
    }

    public warn(message: string, meta?: any): void {
        this.logger.warn(message, meta);
    }

    public info(message: string, meta?: any): void {
        this.logger.info(message, meta);
    }

    public debug(message: string, meta?: any): void {
        this.logger.debug(message, meta);
    }
}

import { StatusCodes } from 'http-status-codes';
// Importerer alle nødvendige biblioteker
import {
  Response,
  Application,
  json,
  urlencoded,
  Request,
  NextFunction,
} from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import cookieSession from 'cookie-session';
import HTTP_STATUS from 'http-status-codes';
import { Server, Socket } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import 'express-async-errors';
import { config } from './config';
import applicationRoutes from './routes';
import {
  CustomError,
  IErrorResponse,
} from './shared/globals/helpers/error-handler';
import Logger from 'bunyan';

const SERVER_PORT = 3000;
const log: Logger = config.createLogger('setupServer');

// Oppretter klassen ChattyServer
export class ChattyServer {
  private app: Application;

  constructor(app: Application) {
    // Lagrer Express applikasjonen
    this.app = app;
  }

  public start(): void {
    // Setter opp sikkerhet, standard funksjoner, ruting, feilhåndtering, og starter serveren
    this.securityMiddleware(this.app);
    this.standarMiddleware(this.app);
    this.routesMiddleware(this.app);
    this.globalErrorHandler(this.app);
    this.startServer(this.app);
  }

  private securityMiddleware(app: Application): void {
    // Setter opp sikkerhetsfunksjoner som sesjonscookies, sikkerhetshoder, HTTP parameterbeskyttelse, og CORS
    app.use(
      cookieSession({
        name: 'session',
        keys: [config.SECRET_KEY_ONE!, config.SECRET_KEY_TWO!],
        maxAge: 24 * 7 * 360000,
        secure: config.NODE_ENV !== 'development',
      })
    );
    app.use(helmet());
    app.use(hpp());
    app.use(
      cors({
        origin: config.CLIENT_URL,
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      })
    );
  }

  private standarMiddleware(app: Application): void {
    // Setter opp standardfunksjoner som HTTP kompresjon og JSON og url-encoded kropps-parser
    app.use(compression());
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }));
  }

  private routesMiddleware(app: Application): void {
    applicationRoutes(app);
  }

  private globalErrorHandler(app: Application): void {
    app.use('*', (req: Request, res: Response) => {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: `${req.originalUrl} not found` });
    });

    app.use(
      (
        error: IErrorResponse,
        _req: Request,
        res: Response,
        next: NextFunction
      ) => {
        log.error(error);
        if (error instanceof CustomError) {
          return res.status(error.statusCode).json(error.serializeErrors());
        }
        next();
      }
    );
  }

  private async startServer(app: Application): Promise<void> {
    // Starter HTTP og socket.io serveren
    try {
      const httpServer: http.Server = new http.Server(app);
      const socketIO: Server = await this.createSocketIO(httpServer);
      this.startHttpServer(httpServer);
      this.socketIOConnections(socketIO);
    } catch (error) {
      log.error(error);
    }
  }

  private async createSocketIO(httpServer: http.Server): Promise<Server> {
    // Oppretter en socket.io server og bruker redis som adapter for horisontal skalering
    const io: Server = new Server(httpServer, {
      cors: {
        origin: config.CLIENT_URL,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      },
    });
    const subClient = createClient({ url: config.REDIS_HOST });
    const pubClient = subClient.duplicate();
    // Kobler til Redis serveren
    await Promise.all([subClient.connect(), pubClient.connect()]);
    // Setter opp en adapter for å tillate horizontal skalering av WebSocket-tilkoblinger
    io.adapter(createAdapter(pubClient, subClient));
    return io;
  }

  private startHttpServer(httpServer: http.Server): void {
    // Starter http serveren og lytter på en gitt port
    log.info(`Starting server with process id ${process.pid}`);
    httpServer.listen(SERVER_PORT, () => {
      log.info(`Server running on port ${SERVER_PORT}`);
    });
  }

  private socketIOConnections(io: Server): void {
    // Her kan du håndtere socket.io-tilkoblinger, for eksempel å lytte på spesifikke events eller sende meldinger til klienter
  }
}

import type {
  ModelBindingName,
  SupportedFormat,
} from './formats';

export interface WorkerService {
  fetch(request: Request): Promise<Response>;
}

type Env = {
  [Format in SupportedFormat as ModelBindingName<Format>]: WorkerService;
};

export default Env;

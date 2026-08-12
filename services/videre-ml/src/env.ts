/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

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

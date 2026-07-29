import { Router } from 'itty-router';

import {
  applyPublicApiCors,
  publicApiPreflight,
} from '@videre-api/apiPolicy';
import { Error, asJSON } from '@videre-api/responses';

import { SUPPORTED_FORMATS } from '../formats';
import {
  describeManafold,
  modelHealth,
  runInference,
} from './manafold';

export default Router({
  before: [publicApiPreflight],
  finally: [asJSON, applyPublicApiCors],
})
  .get('/', () => ({
    object: 'service',
    status: 'ok',
    service: 'videre-ml',
    formats: SUPPORTED_FORMATS,
  }))
  .get('/health', () => ({
    object: 'service',
    status: 'ok',
    service: 'videre-ml',
    formats: SUPPORTED_FORMATS,
  }))
  .get('/manafold', describeManafold)
  .get('/manafold/:format', modelHealth)
  .post('/manafold', runInference)
  .post('/manafold/:format', runInference)
  .all('/manafold', () => Error(405, 'Manafold inference accepts POST requests.'))
  .all('/manafold/*', () => Error(405, 'Manafold inference accepts POST requests.'))
  .all('*', () => Error(404, 'Could not find the requested resource.'));

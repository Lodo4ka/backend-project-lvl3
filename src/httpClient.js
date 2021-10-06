import axios from 'axios';
import debug from 'debug';
import { addLogger } from 'axios-debug-log';

const httpClient = axios.create();

const httpLogger = debug('page-loader');
addLogger(httpClient, httpLogger);

export default httpClient;

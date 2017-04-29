import { filter } from 'rxjs/operator/filter';
import { map } from 'rxjs/operator/map';
import { debounce } from 'rxjs/operator/debounce';
import { groupBy } from 'rxjs/operator/groupBy';
import { switchMap } from 'rxjs/operator/switchMap';
import { mergeMap } from 'rxjs/operator/mergeMap';
import 'rxjs/add/operator/catch';
import { retry } from 'rxjs/operator/retry';
import { takeUntil } from 'rxjs/operator/takeUntil';

import { merge } from 'rxjs/observable/merge';
import { of } from 'rxjs/observable/of';
import { timer } from 'rxjs/observable/timer';
import { empty } from 'rxjs/observable/empty';
import { ajax as ajaxObservable } from 'rxjs/observable/dom/ajax';

import stringify from 'qs/lib/stringify';

let ajaxConfig;
let encodingConfig;
const defaultConfig = {
  requestSuffix: 'REQUEST',
  successSuffix: 'SUCCESS',
  failureSuffix: 'FAILURE',
  urlEncoder: stringify,
  arrayFormat: 'indices',
};

export function createAjaxEpic(config) {
  ajaxConfig = config ? { ...defaultConfig, ...config } : defaultConfig;
  encodingConfig = { arrayFormat: ajaxConfig.arrayFormat };
  return ajaxEpic;
}

function ajaxEpic(action$) {
  return action$
    ::filter(action => action.ajax)
    ::groupBy(action => {
      let group = getAjaxMetaProp(action, 'groupUid');
      if (group) {
        return group;
      }
      group = getAjaxMetaProp(action, 'group');
      return group ? `${action.type}/${group}` : action.type;
    })
    ::mergeMap(groupedAction$ => {
      return merge(
        groupedAction$
          ::filter(action => getAjaxMetaProp(action, 'resolve') === 'LATEST')
          ::map(scrubAjaxActionOfImpurities)
          ::debounce(debounceIfTimeIsSet)
          ::switchMap(({ action, callbacks }) => getAjaxResponse(action, callbacks, action$)),
        groupedAction$
          ::filter(action => getAjaxMetaProp(action, 'resolve') !== 'LATEST')
          ::map(scrubAjaxActionOfImpurities)
          ::debounce(debounceIfTimeIsSet)
          ::mergeMap(({ action, callbacks }) => getAjaxResponse(action, callbacks, action$))
      );
    });
}

const completeKey = '_onCompleteForFSAAToolsOnly';
const errorKey = '_onErrorForFSAAToolsOnly';
function scrubAjaxActionOfImpurities(action) {
  const callbacks = {};
  if (action.ajax.response) {
    callbacks.response = action.ajax.response;
    delete action.ajax.response;
  }
  if (action.ajax[completeKey]) {
    callbacks.onComplete = action.ajax[completeKey];
    delete action.ajax[completeKey];
  }
  if (action.ajax[errorKey]) {
    callbacks.onError = action.ajax[errorKey];
    delete action.ajax[errorKey];
  }
  return { action, callbacks };
}

function debounceIfTimeIsSet({ action }) {
  const debounceTime = getAjaxMetaProp(action, 'debounce');
  return debounceTime ? timer(debounceTime) : empty();
}

function getAjaxResponse(action, callbacks, action$) {
  const { ajax } = action;
  let response$ = ajaxObservable(getRequest(ajax));

  const retryCount = getMetaProp(ajax, 'retry');
  if (retryCount) {
    response$ = response$::retry(retryCount);
  }

  const cancelType = getMetaProp(ajax, 'cancelType');
  if (cancelType) {
    response$ = response$::takeUntil(
      action$::filter(a => a.type === cancelType)
    );
  }

  const prefix = ajaxConfig.requestSuffix
    ? action.type.replace(new RegExp(ajaxConfig.requestSuffix + '$'), '')
    : (action.type + '_');

  const responseMeta = getResponseMetadata(action, ajax);

  return response$
    ::map(({ response }) => {
      const res = callbacks.response ? callbacks.response(response) : response;
      if (callbacks.onComplete) {
        callbacks.onComplete(res);
      }
      return {
        type: prefix + ajaxConfig.successSuffix,
        payload: res,
        meta: responseMeta
      };
    })
    .catch(err => {
      const res = { status: err.status };
      if (callbacks.onError) {
        callbacks.onError(res);
      }
      return of({
        type: prefix + ajaxConfig.failureSuffix,
        error: true,
        payload: res,
        meta: responseMeta
      });
    });
}

function getRequest(ajax) {
  ajax = isString(ajax) ? { url: ajax, method: 'GET' } : ajax;

  const request = {
    method: ajax.method,
    url: ajax.url,
    headers: ajax.headers ? { ...ajax.headers } : {},
    timeout: getMetaProp(ajax, 'timeout') || 0,
    responseType: ajax.responseType || 'json',
    crossDomain: ajax.crossDomain || false,
    withCredentials: ajax.withCredentials || false,
  };

  if (request.method !== 'GET') {
    request.body = ajax.data;
  } else if (ajax.data) {
    request.url += '?' + ajaxConfig.urlEncoder(ajax.data, encodingConfig);
  }

  if (!request.headers['Content-Type']) {
    request.headers['Content-Type'] = 'application/json; charset=UTF-8';
  }

  if (ajax.username) {
    request.user = ajax.username;
  }
  if (ajax.password) {
    request.password = ajax.password;
  }

  return request;
}

function getResponseMetadata(action, ajax) {
  const responseMeta = { ajax };
  if (action.payload) {
    responseMeta.payload = action.payload;
  }
  return responseMeta;
}

function getAjaxMetaProp(action, prop) {
  return action.ajax ? getMetaProp(action.ajax, prop) : undefined;
}

function getMetaProp(ajax, prop) {
  return ajax.meta ? ajax.meta[prop] : undefined;
}

function isString(data) {
  return typeof data === 'string' || data instanceof String;
}

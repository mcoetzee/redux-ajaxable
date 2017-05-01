import { filter } from 'rxjs/operator/filter';
import { map } from 'rxjs/operator/map';
import { debounce } from 'rxjs/operator/debounce';
import { groupBy } from 'rxjs/operator/groupBy';
import { switchMap } from 'rxjs/operator/switchMap';
import { mergeMap } from 'rxjs/operator/mergeMap';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/do';
import { retry } from 'rxjs/operator/retry';
import { takeUntil } from 'rxjs/operator/takeUntil';
import { ignoreElements } from 'rxjs/operator/ignoreElements';

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

function ajaxEpic(action$, middlewareApi) {
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
          ::switchMap(scrubbed =>
            getAjaxResponse(scrubbed, action$, middlewareApi)
          ),
        groupedAction$
          ::filter(action => getAjaxMetaProp(action, 'resolve') !== 'LATEST')
          ::map(scrubAjaxActionOfImpurities)
          ::debounce(debounceIfTimeIsSet)
          ::mergeMap(scrubbed =>
            getAjaxResponse(scrubbed, action$, middlewareApi)
          )
      );
    });
}

const completeKey = '_onCompleteForFSAAToolsOnly';
const errorKey = '_onErrorForFSAAToolsOnly';

function scrubAjaxActionOfImpurities(action) {
  const { ajax } = action;
  const callbacks = {};
  if (ajax.response) {
    callbacks.response = ajax.response;
    delete ajax.response;
  }
  if (ajax[completeKey]) {
    callbacks.onComplete = ajax[completeKey];
    delete ajax[completeKey];
  }
  if (ajax[errorKey]) {
    callbacks.onError = ajax[errorKey];
    delete ajax[errorKey];
  }
  return { action, callbacks };
}

function debounceIfTimeIsSet(scrubbed) {
  const debounceTime = getAjaxMetaProp(scrubbed.action, 'debounce');
  return debounceTime ? timer(debounceTime) : empty();
}

function getAjaxResponse(scrubbed, action$, middlewareApi) {
  const { action, callbacks } = scrubbed;
  let response$ = ajaxObservable(getRequest(action.ajax));

  const retryCount = getAjaxMetaProp(action, 'retry');
  if (retryCount) {
    response$ = response$::retry(retryCount);
  }

  const cancelType = getAjaxMetaProp(action, 'cancelType');
  if (cancelType) {
    response$ = response$::takeUntil(
      action$::filter(a => a.type === cancelType)
    );
  }

  const responsePrefix = getResponseTypePrefix(action);
  const responseMeta = getResponseMetadata(action);

  return response$
    ::map(({ response }) => {
      return {
        type: responsePrefix + ajaxConfig.successSuffix,
        payload: callbacks.response ? callbacks.response(response) : response,
        meta: responseMeta
      };
    })
    .catch(err => {
      return of({
        type: responsePrefix + ajaxConfig.failureSuffix,
        error: true,
        payload: { status: err.status },
        meta: responseMeta
      });
    })
    .do(responseAction => {
      middlewareApi.dispatch(responseAction);
      if (!responseAction.error && callbacks.onComplete) {
        callbacks.onComplete(responseAction.payload);
      }
      if (responseAction.error && callbacks.onError) {
        callbacks.onError(responseAction.payload);
      }
    })
    ::ignoreElements();
}

function getRequest(ajax) {
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

function getResponseTypePrefix(action) {
  return ajaxConfig.requestSuffix
    ? action.type.replace(new RegExp(ajaxConfig.requestSuffix + '$'), '')
    : (action.type + '_');
}

function getResponseMetadata(action) {
  const responseMeta = { ajax: action.ajax };
  if (action.payload) {
    responseMeta.payload = action.payload;
  }
  return responseMeta;
}

function getAjaxMetaProp(action, prop) {
  return getMetaProp(action.ajax, prop);
}

function getMetaProp(ajax, prop) {
  return ajax.meta ? ajax.meta[prop] : undefined;
}

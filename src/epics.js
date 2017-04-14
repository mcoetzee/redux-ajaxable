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

let ajaxConfig;
const defaultConfig = {
  requestSuffix: '',
  successSuffix: 'SUCCESS',
  failureSuffix: 'FAILURE',
};

export function createAjaxEpic(config) {
  ajaxConfig = config ? { ...defaultConfig, ...config } : defaultConfig;
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
          ::switchMap(({ action, callback }) => getAjaxResponse(action, callback, action$)),
        groupedAction$
          ::filter(action => getAjaxMetaProp(action, 'resolve') !== 'LATEST')
          ::map(scrubAjaxActionOfImpurities)
          ::debounce(debounceIfTimeIsSet)
          ::mergeMap(({ action, callback }) => getAjaxResponse(action, callback, action$))
      );
    });
}

function scrubAjaxActionOfImpurities(action) {
  const callback = action.ajax.response;
  delete action.ajax.response;
  return { action, callback };
}

function debounceIfTimeIsSet({ action }) {
  const debounceTime = getAjaxMetaProp(action, 'debounce');
  return debounceTime ? timer(debounceTime) : empty();
}

function getAjaxResponse(action, callback, action$) {
  let { ajax } = action;
  const responseMeta = getResponseMetadata(action, ajax);
  ajax = isString(ajax) ? { url: ajax, method: 'GET' } : ajax;

  const params = {
    method: ajax.method,
    url: ajax.url,
    headers: ajax.headers || {},
    timeout: getMetaProp(ajax, 'timeout') || 0
  };

  if (!params.headers['Content-Type']) {
    params.headers['Content-Type'] = 'application/json; charset=UTF-8';
  }

  if (params.method !== 'GET') {
    params.body = ajax.data;
  } else if (ajax.data) {
    params.url += '?' + getQueryString(ajax.data);
  }

  let response$ = ajaxObservable(params);

  const retryCount = getMetaProp(ajax, 'retry');
  if (retryCount) {
    response$ = response$::retry(retryCount);
  }

  const cancelType = getMetaProp(ajax, 'cancelType');
  if (action$ && cancelType) {
    response$ = response$::takeUntil(
      action$::filter(a => a.type === cancelType)
    );
  }

  const prefix = ajaxConfig.requestSuffix
    ? action.type.replace(new RegExp(ajaxConfig.requestSuffix + '$'), '')
    : (action.type + '_');

  return response$
    ::map(({ response }) => ({
      type: prefix + ajaxConfig.successSuffix,
      payload: callback ? callback(response) : response,
      meta: responseMeta
    }))
    .catch(err => of({
      type: prefix + ajaxConfig.failureSuffix,
      error: true,
      payload: { status: err.status },
      meta: responseMeta
    }));
}

function getAjaxMetaProp(action, prop) {
  return action.ajax ? getMetaProp(action.ajax, prop) : undefined;
}

function getMetaProp(ajax, prop) {
  return ajax.meta ? ajax.meta[prop] : undefined;
}

function getResponseMetadata(action, ajax) {
  const responseMeta = action.meta ? { ...action.meta } : {};
  responseMeta.ajax = ajax;
  if (action.payload) {
    responseMeta.args = action.payload;
  }
  return responseMeta;
}

function getQueryString(params) {
  return Object.keys(params)
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');
}

function isString(data) {
  return typeof data === 'string' || data instanceof String;
}

import { Subject } from 'rxjs/Subject';
import { createAjaxEpic } from './epics';

export function createAjaxMiddleware(config) {
  const action$ = new Subject();
  const ajaxEpic = createAjaxEpic(config);

  return middlewareApi => next => {
    ajaxEpic(action$).subscribe(middlewareApi.dispatch);
    return action => {
      action$.next(action);
      return next(action);
    };
  };
}

import { Subject } from 'rxjs/Subject';
import { createAjaxEpic } from './epics';

export function createAjaxMiddleware(config) {
  const action$ = new Subject();
  const ajaxEpic = createAjaxEpic(config);

  return middlewareApi => next => {
    ajaxEpic(action$, middlewareApi).subscribe();

    return action => {
      if (action.ajax && action.ajax.chain) {
        const { chain } = action.ajax;
        delete action.ajax.chain;

        if (chain.length) {
          action.ajax._onCompleteForFSAAToolsOnly = res => {
            const nextAjaxAction = chain.shift()(res);
            if (chain.length) {
              nextAjaxAction.ajax.chain = chain;
            }
            middlewareApi.dispatch(nextAjaxAction);
          };
        }
      }
      action$.next(action);
      return next(action);
    };
  };
}

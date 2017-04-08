/* globals describe it beforeEach afterEach */
import { expect } from 'chai';
import { createStore, applyMiddleware } from 'redux';
import { createAjaxMiddleware } from '../';
import nock from 'nock';

global.XMLHttpRequest = require('xhr2');

let store;
describe('createAjaxMiddleware', () => {
  beforeEach(() => {
    const reducer = (state = [], action) => state.concat(action);
    const ajaxMiddleware = createAjaxMiddleware({ requestSuffix: 'REQUEST' });
    store = createStore(reducer, applyMiddleware(ajaxMiddleware));
  });

  afterEach(() => nock.cleanAll());

  it('should get', done => {
    const req = nock('http://localhost:7000')
      .get('/api/foos')
      .reply(200, [{ id: 11 }]);

    store.dispatch({
      type: 'FOO_REQUEST',
      ajax: 'http://localhost:7000/api/foos'
    });

    setTimeout(
      () => {
        expectToHaveMade(req);

        const actions = store.getState();
        expect(actions).to.deep.equal([
          { type: '@@redux/INIT' },
          {
            type: 'FOO_REQUEST',
            ajax: 'http://localhost:7000/api/foos'
          },
          {
            type: 'FOO_SUCCESS',
            payload: [{ id: 11 }],
            meta: {
              ajax: 'http://localhost:7000/api/foos'
            }
          }
        ]);
        done();
      },
      20
    );
  });

  it('should debounce', done => {
    const page1Request = nock('http://localhost:7000')
      .get('/api/foos')
      .query({ page: 1 })
      .reply(200, [{ id: 11 }]);

    const page2Request = nock('http://localhost:7000')
      .get('/api/foos')
      .query({ page: 2 })
      .reply(200, [{ id: 21 }]);

    store.dispatch({
      type: 'FOO_REQUEST',
      ajax: {
        url: 'http://localhost:7000/api/foos',
        method: 'GET',
        data: { page: 1 },

        meta: { debounce: 10 }
      }
    });

    store.dispatch({
      type: 'FOO_REQUEST',
      ajax: {
        url: 'http://localhost:7000/api/foos',
        method: 'GET',
        data: { page: 2 },

        meta: { debounce: 10 }
      }
    });

    setTimeout(
      () => {
        expectNotToHaveMade(page1Request);
        expectToHaveMade(page2Request);

        const actions = store.getState();
        expect(actions).to.deep.equal([
          { type: '@@redux/INIT' },
          {
            type: 'FOO_REQUEST',
            ajax: {
              url: 'http://localhost:7000/api/foos',
              method: 'GET',
              data: { page: 1 },

              meta: { debounce: 10 }
            }
          },
          {
            type: 'FOO_REQUEST',
            ajax: {
              url: 'http://localhost:7000/api/foos',
              method: 'GET',
              data: { page: 2 },

              meta: { debounce: 10 }
            }
          },
          {
            type: 'FOO_SUCCESS',
            payload: [{ id: 21 }],
            meta: {
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'GET',
                data: { page: 2 },

                meta: { debounce: 10 }
              }
            }
          }
        ]);
        done();
      },
      30
    );
  });

  it('should resolve latest', done => {
    const page1Request = nock('http://localhost:7000')
      .get('/api/foos')
      .delay(10)
      .query({ page: 1 })
      .reply(200, [{ id: 11 }]);

    const page2Request = nock('http://localhost:7000')
      .get('/api/foos')
      .delay(10)
      .query({ page: 2 })
      .reply(200, [{ id: 21 }]);

    store.dispatch({
      type: 'FOO_REQUEST',
      ajax: {
        url: 'http://localhost:7000/api/foos',
        method: 'GET',
        data: { page: 1 },

        meta: { resolve: 'LATEST' }
      }
    });

    store.dispatch({
      type: 'FOO_REQUEST',
      ajax: {
        url: 'http://localhost:7000/api/foos',
        method: 'GET',
        data: { page: 2 },

        meta: { resolve: 'LATEST' }
      }
    });

    setTimeout(
      () => {
        expectToHaveMade(page1Request);
        expectToHaveMade(page2Request);

        const actions = store.getState();
        expect(actions).to.deep.equal([
          { type: '@@redux/INIT' },
          {
            type: 'FOO_REQUEST',
            ajax: {
              url: 'http://localhost:7000/api/foos',
              method: 'GET',
              data: { page: 1 },

              meta: { resolve: 'LATEST' }
            }
          },
          {
            type: 'FOO_REQUEST',
            ajax: {
              url: 'http://localhost:7000/api/foos',
              method: 'GET',
              data: { page: 2 },

              meta: { resolve: 'LATEST' }
            }
          },
          {
            type: 'FOO_SUCCESS',
            payload: [{ id: 21 }],
            meta: {
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'GET',
                data: { page: 2 },

                meta: { resolve: 'LATEST' }
              }
            }
          }
        ]);
        done();
      },
      30
    );
  });

  it('should retry', done => {
    const firstFailingRequest = nock('http://localhost:7000')
      .post('/api/foos', { foo: { bar: 'shoot' } })
      .reply(500, 'Oops!');

    const secondFailingRequest = nock('http://localhost:7000')
      .post('/api/foos', { foo: { bar: 'shoot' } })
      .reply(500, 'Oops!');

    const successfullRequest = nock('http://localhost:7000')
      .post('/api/foos', { foo: { bar: 'shoot' } })
      .reply(200, { id: 21, bar: 'shot' });

    store.dispatch({
      type: 'FOO_REQUEST',
      ajax: {
        url: 'http://localhost:7000/api/foos',
        method: 'POST',
        data: { foo: { bar: 'shoot' } },

        meta: { retry: 2 }
      }
    });

    setTimeout(
      () => {
        expectToHaveMade(firstFailingRequest);
        expectToHaveMade(secondFailingRequest);
        expectToHaveMade(successfullRequest);

        const actions = store.getState();
        expect(actions).to.deep.equal([
          { type: '@@redux/INIT' },
          {
            type: 'FOO_REQUEST',
            ajax: {
              url: 'http://localhost:7000/api/foos',
              method: 'POST',
              data: { foo: { bar: 'shoot' } },

              meta: { retry: 2 }
            }
          },
          {
            type: 'FOO_SUCCESS',
            payload: { id: 21, bar: 'shot' },
            meta: {
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'POST',
                data: { foo: { bar: 'shoot' } },

                meta: { retry: 2 }
              }
            }
          }
        ]);
        done();
      },
      30
    );
  });

  it('should fail when retries are exhausted', done => {
    const firstFailingRequest = nock('http://localhost:7000')
      .post('/api/foos', { foo: { bar: 'shoot' } })
      .reply(500, 'Oops!');

    const secondFailingRequest = nock('http://localhost:7000')
      .post('/api/foos', { foo: { bar: 'shoot' } })
      .reply(500, 'Oops!');

    const thirdRequest = nock('http://localhost:7000')
      .post('/api/foos', { foo: { bar: 'shoot' } })
      .reply(200, { id: 21, bar: 'shot' });

    store.dispatch({
      type: 'FOO_REQUEST',
      ajax: {
        url: 'http://localhost:7000/api/foos',
        method: 'POST',
        data: { foo: { bar: 'shoot' } },

        meta: { retry: 1 }
      }
    });

    setTimeout(
      () => {
        expectToHaveMade(firstFailingRequest);
        expectToHaveMade(secondFailingRequest);
        expectNotToHaveMade(thirdRequest);

        const actions = store.getState();
        expect(actions).to.deep.equal([
          { type: '@@redux/INIT' },
          {
            type: 'FOO_REQUEST',
            ajax: {
              url: 'http://localhost:7000/api/foos',
              method: 'POST',
              data: { foo: { bar: 'shoot' } },

              meta: { retry: 1 }
            }
          },
          {
            type: 'FOO_FAILURE',
            error: true,
            payload: { status: 500 },
            meta: {
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'POST',
                data: { foo: { bar: 'shoot' } },

                meta: { retry: 1 }
              }
            }
          }
        ]);
        done();
      },
      30
    );
  });

  it('should timeout', done => {
    const timeoutRequest = nock('http://localhost:7000')
      .post('/api/foos', { foo: { bar: 'shoot' } })
      .socketDelay(20)
      .reply(200, {});

    store.dispatch({
      type: 'FOO_REQUEST',
      ajax: {
        url: 'http://localhost:7000/api/foos',
        method: 'POST',
        data: { foo: { bar: 'shoot' } },
        meta: { timeout: 10 }
      }
    });

    setTimeout(
      () => {
        expectToHaveMade(timeoutRequest);

        const actions = store.getState();
        expect(actions).to.deep.equal([
          { type: '@@redux/INIT' },
          {
            type: 'FOO_REQUEST',
            ajax: {
              url: 'http://localhost:7000/api/foos',
              method: 'POST',
              data: { foo: { bar: 'shoot' } },
              meta: { timeout: 10 }
            }
          },
          {
            type: 'FOO_FAILURE',
            error: true,
            payload: { status: 0 },
            meta: {
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'POST',
                data: { foo: { bar: 'shoot' } },
                meta: { timeout: 10 }
              }
            }
          }
        ]);
        done();
      },
      30
    );
  });

  it('should cancel', done => {
    const slowRequest = nock('http://localhost:7000')
      .post('/api/foos', { foo: { bar: 'shoot' } })
      .socketDelay(20)
      .reply(200, {});

    store.dispatch({
      type: 'FOO_REQUEST',
      ajax: {
        url: 'http://localhost:7000/api/foos',
        method: 'POST',
        data: { foo: { bar: 'shoot' } },
        meta: { 
          cancelType: 'FOO_REQUEST_CANCELLATION'
        }
      }
    });

    store.dispatch({ type: 'FOO_REQUEST_CANCELLATION' });

    setTimeout(
      () => {
        expectToHaveMade(slowRequest);

        const actions = store.getState();
        expect(actions).to.deep.equal([
          { type: '@@redux/INIT' },
          {
            type: 'FOO_REQUEST',
            ajax: {
              url: 'http://localhost:7000/api/foos',
              method: 'POST',
              data: { foo: { bar: 'shoot' } },
              meta: { 
                cancelType: 'FOO_REQUEST_CANCELLATION'
              }
            }
          },
          { type: 'FOO_REQUEST_CANCELLATION' }
        ]);
        done();
      },
      30
    );
  });

  it('should group by unique id across different action types', done => {
    const group1AddRequest = nock('http://localhost:7000')
      .post('/api/foos/42/bars', { bar_id: 21 })
      .reply(200, { id: 42, bar_ids: [21] });

    const group1RemoveRequest = nock('http://localhost:7000')
      .delete('/api/foos/42/bars/21')
      .reply(204);

    const group2RemoveRequest = nock('http://localhost:7000')
      .delete('/api/foos/42/bars/22')
      .reply(204);

    store.dispatch({
      type: 'ADD_BAR_REQUEST',
      ajax: {
        url: 'http://localhost:7000/api/foos/42/bars',
        method: 'POST',
        data: { bar_id: 21 },
        meta: { 
          groupByUid: 'bar-21',
          debounce: 10
        }
      }
    });

    store.dispatch({
      type: 'REMOVE_BAR_REQUEST',
      ajax: {
        url: 'http://localhost:7000/api/foos/42/bars/21',
        method: 'DELETE',
        meta: { 
          groupByUid: 'bar-21',
          debounce: 10
        }
      }
    });

    store.dispatch({
      type: 'REMOVE_BAR_REQUEST',
      ajax: {
        url: 'http://localhost:7000/api/foos/42/bars/22',
        method: 'DELETE',
        meta: { 
          groupByUid: 'bar-22',
          debounce: 10
        }
      }
    });

    setTimeout(
      () => {
        expectNotToHaveMade(group1AddRequest);
        expectToHaveMade(group1RemoveRequest);
        expectToHaveMade(group2RemoveRequest);

        const actions = store.getState();
        expect(actions).to.deep.equal([
          { type: '@@redux/INIT' },
          {
            type: 'ADD_BAR_REQUEST',
            ajax: {
              url: 'http://localhost:7000/api/foos/42/bars',
              method: 'POST',
              data: { bar_id: 21 },
              meta: { 
                groupByUid: 'bar-21',
                debounce: 10
              }
            }
          },
          {
            type: 'REMOVE_BAR_REQUEST',
            ajax: {
              url: 'http://localhost:7000/api/foos/42/bars/21',
              method: 'DELETE',
              meta: { 
                groupByUid: 'bar-21',
                debounce: 10
              }
            }
          },
          {
            type: 'REMOVE_BAR_REQUEST',
            ajax: {
              url: 'http://localhost:7000/api/foos/42/bars/22',
              method: 'DELETE',
              meta: { 
                groupByUid: 'bar-22',
                debounce: 10
              }
            }
          },
          {
            type: 'REMOVE_BAR_SUCCESS',
            payload: null,
            meta: {
              ajax: {
                url: 'http://localhost:7000/api/foos/42/bars/21',
                method: 'DELETE',
                meta: { 
                  groupByUid: 'bar-21',
                  debounce: 10
                }
              }
            }
          },
          {
            type: 'REMOVE_BAR_SUCCESS',
            payload: null,
            meta: {
              ajax: {
                url: 'http://localhost:7000/api/foos/42/bars/22',
                method: 'DELETE',
                meta: { 
                  groupByUid: 'bar-22',
                  debounce: 10
                }
              }
            }
          }
        ]);
        done();
      },
      30
    );
  });
});

function expectToHaveMade(req) {
  req.done();
}

function expectNotToHaveMade(req) {
  expect(req.isDone()).to.eq(false);
}
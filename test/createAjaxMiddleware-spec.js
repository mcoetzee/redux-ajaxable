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
        req.done();
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
    const requestThatShouldNotBeMade = nock('http://localhost:7000')
      .get('/api/foos')
      .query({ page: 1 })
      .reply(200, [{ id: 11 }]);

    const requestThatShouldBeMade = nock('http://localhost:7000')
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
        expect(requestThatShouldNotBeMade.isDone()).to.eq(false);
        requestThatShouldBeMade.done();

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
    const requestThatShouldNotResolve = nock('http://localhost:7000')
      .get('/api/foos')
      .delay(10)
      .query({ page: 1 })
      .reply(200, [{ id: 11 }]);

    const requestThatShouldResolve = nock('http://localhost:7000')
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
        // expectToHaveMade(requestThatShouldNotResolve);
        // expectNotToHaveMade(requestThatShouldNotBeMade);

        requestThatShouldNotResolve.done();
        requestThatShouldResolve.done();

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
        firstFailingRequest.done();
        secondFailingRequest.done();
        successfullRequest.done();

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

    const requestThatShouldNotBeMade = nock('http://localhost:7000')
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
        firstFailingRequest.done();
        secondFailingRequest.done();
        expect(requestThatShouldNotBeMade.isDone()).to.eq(false);

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
});

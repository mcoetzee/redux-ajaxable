/* globals describe it beforeEach afterEach */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import nock from 'nock';
import { createStore, applyMiddleware } from 'redux';
import { createAjaxMiddleware } from '../';

chai.use(sinonChai);
global.XMLHttpRequest = require('xhr2');

let store;
let requests;

function setupStore(ajaxConfig) {
  const reducer = (state = [], action) => state.concat(action);
  const ajaxMiddleware = createAjaxMiddleware(ajaxConfig);
  store = createStore(reducer, applyMiddleware(ajaxMiddleware));
  nock.disableNetConnect();
  requests = {};
}

describe('createAjaxMiddleware', () => {
  describe('ajax', () => {
    beforeEach(() => {
      setupStore({ requestSuffix: 'REQUEST' });
    });

    afterEach(() => {
      nock.cleanAll();
      nock.enableNetConnect();
    });

    it('should make GET requests', done => {
      requests.request = nock('http://localhost:7000')
        .get('/api/foos')
        .reply(200, [{ id: 11 }]);

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos',
          method: 'GET'
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('request');

          const actions = store.getState();
          expect(actions).to.deep.equal([
            { type: '@@redux/INIT' },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'GET'
              }
            },
            {
              type: 'FOO_SUCCESS',
              payload: [{ id: 11 }],
              meta: {
                ajax: {
                  url: 'http://localhost:7000/api/foos',
                  method: 'GET'
                }
              }
            }
          ]);
          done();
        },
        20
      );
    });

    it('should encode GET request data into query string params', done => {
      requests.getRequest = nock('http://localhost:7000')
        .get('/api/foos')
        .query({ bar_ids: [21, 31] })
        .reply(200, [{ id: 11, bar_id: 21 }]);

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos',
          method: 'GET',
          data: { bar_ids: [21, 31] }
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('getRequest');

          const actions = store.getState();
          expect(actions).to.deep.equal([
            { type: '@@redux/INIT' },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'GET',
                data: { bar_ids: [21, 31] }
              }
            },
            {
              type: 'FOO_SUCCESS',
              payload: [{ id: 11, bar_id: 21 }],
              meta: {
                ajax: {
                  url: 'http://localhost:7000/api/foos',
                  method: 'GET',
                  data: { bar_ids: [21, 31] }
                }
              }
            }
          ]);
          done();
        },
        20
      );
    });

    it('should make POST requests', done => {
      requests.postRequest = nock('http://localhost:7000')
        .post('/api/foos', { foo: 'bar' })
        .reply(200, [{ id: 11 }]);

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos',
          method: 'POST',
          data: { foo: 'bar' }
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('postRequest');

          const actions = store.getState();
          expect(actions).to.deep.equal([
            { type: '@@redux/INIT' },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'POST',
                data: { foo: 'bar' }
              }
            },
            {
              type: 'FOO_SUCCESS',
              payload: [{ id: 11 }],
              meta: {
                ajax: {
                  url: 'http://localhost:7000/api/foos',
                  method: 'POST',
                  data: { foo: 'bar' }
                }
              }
            }
          ]);
          done();
        },
        20
      );
    });

    it('should make PATCH requests', done => {
      requests.patchRequest = nock('http://localhost:7000')
        .patch('/api/foos/11', { foo: 'bar' })
        .reply(200, [{ id: 11 }]);

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos/11',
          method: 'PATCH',
          data: { foo: 'bar' }
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('patchRequest');

          const actions = store.getState();
          expect(actions).to.deep.equal([
            { type: '@@redux/INIT' },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos/11',
                method: 'PATCH',
                data: { foo: 'bar' }
              }
            },
            {
              type: 'FOO_SUCCESS',
              payload: [{ id: 11 }],
              meta: {
                ajax: {
                  url: 'http://localhost:7000/api/foos/11',
                  method: 'PATCH',
                  data: { foo: 'bar' }
                }
              }
            }
          ]);
          done();
        },
        20
      );
    });

    it('should make PUT requests', done => {
      requests.putRequest = nock('http://localhost:7000')
        .put('/api/foos/11/bar')
        .reply(204);

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos/11/bar',
          method: 'PUT',
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('putRequest');

          const actions = store.getState();
          expect(actions).to.deep.equal([
            { type: '@@redux/INIT' },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos/11/bar',
                method: 'PUT',
              }
            },
            {
              type: 'FOO_SUCCESS',
              payload: null,
              meta: {
                ajax: {
                  url: 'http://localhost:7000/api/foos/11/bar',
                  method: 'PUT',
                }
              }
            }
          ]);
          done();
        },
        20
      );
    });

    it('should make DELETE requests', done => {
      requests.deleteRequest = nock('http://localhost:7000')
        .delete('/api/foos/11/bar')
        .reply(204);

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos/11/bar',
          method: 'DELETE',
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('deleteRequest');

          const actions = store.getState();
          expect(actions).to.deep.equal([
            { type: '@@redux/INIT' },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos/11/bar',
                method: 'DELETE',
              }
            },
            {
              type: 'FOO_SUCCESS',
              payload: null,
              meta: {
                ajax: {
                  url: 'http://localhost:7000/api/foos/11/bar',
                  method: 'DELETE',
                }
              }
            }
          ]);
          done();
        },
        20
      );
    });

    it('should handle failures', done => {
      requests.failingRequest = nock('http://localhost:7000')
        .patch('/api/foos/11', { foo: { bar: 'shot' } })
        .reply(401);

      requests.anotherRequest = nock('http://localhost:7000')
        .patch('/api/foos/11', { foo: { bar: 'shot' } })
        .reply(204);

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos/11',
          method: 'PATCH',
          data: { foo: { bar: 'shot' } }
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('failingRequest');
          expectNotToHaveMade('anotherRequest');

          const actions = store.getState();
          expect(actions).to.deep.equal([
            { type: '@@redux/INIT' },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos/11',
                method: 'PATCH',
                data: { foo: { bar: 'shot' } }
              }
            },
            {
              type: 'FOO_FAILURE',
              error: true,
              payload: { status: 401 },
              meta: {
                ajax: {
                  url: 'http://localhost:7000/api/foos/11',
                  method: 'PATCH',
                  data: { foo: { bar: 'shot' } }
                }
              }
            }
          ]);
          done();
        },
        20
      );
    });

    it('should debounce', done => {
      requests.page1Request = nock('http://localhost:7000')
        .get('/api/foos')
        .query({ page: 1 })
        .reply(200, [{ id: 11 }]);

      requests.page2Request = nock('http://localhost:7000')
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
          expectNotToHaveMade('page1Request');
          expectToHaveMade('page2Request');

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
      requests.page1Request = nock('http://localhost:7000')
        .get('/api/foos')
        .delay(10)
        .query({ page: 1 })
        .reply(200, [{ id: 11 }]);

      requests.page2Request = nock('http://localhost:7000')
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
          expectToHaveMade('page1Request');
          expectToHaveMade('page2Request');

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
      requests.firstFailingRequest = nock('http://localhost:7000')
        .post('/api/foos', { foo: { bar: 'shoot' } })
        .reply(500, 'Oops!');

      requests.secondFailingRequest = nock('http://localhost:7000')
        .post('/api/foos', { foo: { bar: 'shoot' } })
        .reply(500, 'Oops!');

      requests.successfullRequest = nock('http://localhost:7000')
        .post('/api/foos', { foo: { bar: 'shoot' } })
        .reply(200, { id: 21, bar: 'shot' });

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos',
          method: 'POST',
          data: { foo: { bar: 'shoot' } },

          meta: { retries: 2 }
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('firstFailingRequest');
          expectToHaveMade('secondFailingRequest');
          expectToHaveMade('successfullRequest');

          const actions = store.getState();
          expect(actions).to.deep.equal([
            { type: '@@redux/INIT' },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'POST',
                data: { foo: { bar: 'shoot' } },

                meta: { retries: 2 }
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

                  meta: { retries: 2 }
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
      requests.firstFailingRequest = nock('http://localhost:7000')
        .post('/api/foos', { foo: { bar: 'shoot' } })
        .reply(500, 'Oops!');

      requests.secondFailingRequest = nock('http://localhost:7000')
        .post('/api/foos', { foo: { bar: 'shoot' } })
        .reply(500, 'Oops!');

      requests.thirdRequest = nock('http://localhost:7000')
        .post('/api/foos', { foo: { bar: 'shoot' } })
        .reply(200, { id: 21, bar: 'shot' });

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos',
          method: 'POST',
          data: { foo: { bar: 'shoot' } },

          meta: { retries: 1 }
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('firstFailingRequest');
          expectToHaveMade('secondFailingRequest');
          expectNotToHaveMade('thirdRequest');

          const actions = store.getState();
          expect(actions).to.deep.equal([
            { type: '@@redux/INIT' },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'POST',
                data: { foo: { bar: 'shoot' } },

                meta: { retries: 1 }
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

                  meta: { retries: 1 }
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
      requests.timeoutRequest = nock('http://localhost:7000')
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
          expectToHaveMade('timeoutRequest');

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
      requests.slowRequest = nock('http://localhost:7000')
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
          expectToHaveMade('slowRequest');

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

    it('should group within action types', done => {
      requests.group1Request = nock('http://localhost:7000')
        .get('/api/foos/42')
        .reply(200, { id: 42, t: 1 });

      requests.group2Request = nock('http://localhost:7000')
        .get('/api/foos/84')
        .reply(200, { id: 84, t: 1 });

      requests.otherGroup1Request = nock('http://localhost:7000')
        .get('/api/foos/42')
        .reply(200, { id: 42, t: 2 });

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos/42',
          method: 'GET',
          meta: {
            group: 42,
            debounce: 10
          }
        }
      });

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos/84',
          method: 'GET',
          meta: {
            group: 84,
            debounce: 10
          }
        }
      });

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos/42',
          method: 'GET',
          meta: {
            group: 42,
            debounce: 10
          }
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('group2Request');
          expectToHaveMade('group1Request');
          expectNotToHaveMade('otherGroup1Request');

          const actions = store.getState();
          expect(actions).to.deep.equal([
            { type: '@@redux/INIT' },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos/42',
                method: 'GET',
                meta: {
                  group: 42,
                  debounce: 10
                }
              }
            },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos/84',
                method: 'GET',
                meta: {
                  group: 84,
                  debounce: 10
                }
              }
            },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos/42',
                method: 'GET',
                meta: {
                  group: 42,
                  debounce: 10
                }
              }
            },
            {
              type: 'FOO_SUCCESS',
              payload: { id: 84, t: 1 },
              meta: {
                ajax: {
                  url: 'http://localhost:7000/api/foos/84',
                  method: 'GET',
                  meta: {
                    group: 84,
                    debounce: 10
                  }
                }
              }
            },
            {
              type: 'FOO_SUCCESS',
              payload: { id: 42, t: 1 },
              meta: {
                ajax: {
                  url: 'http://localhost:7000/api/foos/42',
                  method: 'GET',
                  meta: {
                    group: 42,
                    debounce: 10
                  }
                }
              }
            },
          ]);
          done();
        },
        30
      );
    });

    it('should group by unique id across different action types', done => {
      requests.group1AddRequest = nock('http://localhost:7000')
        .post('/api/foos/42/bars', { bar_id: 21 })
        .reply(200, { id: 42, bar_ids: [21] });

      requests.group1RemoveRequest = nock('http://localhost:7000')
        .delete('/api/foos/42/bars/21')
        .reply(204);

      requests.group2RemoveRequest = nock('http://localhost:7000')
        .delete('/api/foos/42/bars/22')
        .reply(204);

      store.dispatch({
        type: 'ADD_BAR_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos/42/bars',
          method: 'POST',
          data: { bar_id: 21 },
          meta: {
            groupUid: 'bar-21',
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
            groupUid: 'bar-21',
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
            groupUid: 'bar-22',
            debounce: 10
          }
        }
      });

      setTimeout(
        () => {
          expectNotToHaveMade('group1AddRequest');
          expectToHaveMade('group1RemoveRequest');
          expectToHaveMade('group2RemoveRequest');

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
                  groupUid: 'bar-21',
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
                  groupUid: 'bar-21',
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
                  groupUid: 'bar-22',
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
                    groupUid: 'bar-21',
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
                    groupUid: 'bar-22',
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

    it('should provide response callback', done => {
      requests.request = nock('http://localhost:7000')
        .get('/api/foos')
        .reply(200, [{ id: 11 }]);

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos',
          method: 'GET',
          response(foos) {
            return foos.map(foo => ({ ...foo, processed: true }));
          }
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('request');

          const actions = store.getState();
          expect(actions).to.deep.equal([
            { type: '@@redux/INIT' },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'GET',
              }
            },
            {
              type: 'FOO_SUCCESS',
              payload: [{ id: 11, processed: true }],
              meta: {
                ajax: {
                  url: 'http://localhost:7000/api/foos',
                  method: 'GET',
                }
              }
            }
          ]);
          done();
        },
        20
      );
    });

    it('should provide on complete callback for FSAA tools', done => {
      requests.request = nock('http://localhost:7000')
        .get('/api/foos')
        .reply(200, [{ id: 11 }]);

      const onCompleteSpy = sinon.spy();
      const onErrorSpy = sinon.spy();
      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos',
          method: 'GET',

          _onCompleteForFSAAToolsOnly: onCompleteSpy,
          _onErrorForFSAAToolsOnly: onErrorSpy
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('request');
          expect(onCompleteSpy).to.have.been.calledWith([{ id: 11 }]);
          // eslint-disable-next-line no-unused-expressions
          expect(onErrorSpy).not.to.have.been.called;
          done();
        },
        20
      );
    });

    it('should provide on error callback for FSAA tools', done => {
      requests.request = nock('http://localhost:7000')
        .get('/api/foos')
        .reply(500);

      const onCompleteSpy = sinon.spy();
      const onErrorSpy = sinon.spy();
      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos',
          method: 'GET',

          _onCompleteForFSAAToolsOnly: onCompleteSpy,
          _onErrorForFSAAToolsOnly: onErrorSpy
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('request');
          expect(onErrorSpy).to.have.been.calledWith({ status: 500 });
          // eslint-disable-next-line no-unused-expressions
          expect(onCompleteSpy).not.to.have.been.called;
          done();
        },
        20
      );
    });

    it('should chain multiple requests together', done => {
      requests.firstRequest = nock('http://localhost:7000')
        .get('/api/foos')
        .query({ page: 1 })
        .reply(200, { id: 'first-req-response' });

      requests.secondRequest = nock('http://localhost:7000')
        .get('/api/foos')
        .query({ id: 'first-req-response', page: 2 })
        .reply(200, { id: 'second-req-response' });

      requests.thirdRequest = nock('http://localhost:7000')
        .get('/api/foos')
        .query({ id: 'second-req-response', page: 3 })
        .reply(200, { id: 'third-req-response' });

      store.dispatch({
        type: 'FIRST_FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos',
          method: 'GET',
          data: { page: 1 },

          chain: [
            res => fetchSecondFoo(res.id),
            res => fetchThirdFoo(res.id)
          ]
        }
      });

      function fetchSecondFoo(id) {
        return {
          type: 'SECOND_FOO_REQUEST',
          ajax: {
            url: 'http://localhost:7000/api/foos',
            method: 'GET',
            data: { id, page: 2 }
          }
        };
      }

      function fetchThirdFoo(id) {
        return {
          type: 'THIRD_FOO_REQUEST',
          ajax: {
            url: 'http://localhost:7000/api/foos',
            method: 'GET',
            data: { id, page: 3 }
          }
        };
      }

      setTimeout(
        () => {
          expectToHaveMade('firstRequest');
          expectToHaveMade('secondRequest');
          expectToHaveMade('thirdRequest');

          const actions = store.getState();
          expect(actions).to.deep.equal([
            { type: '@@redux/INIT' },
            {
              type: 'FIRST_FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'GET',
                data: { page: 1 }
              }
            },
            {
              type: 'FIRST_FOO_SUCCESS',
              payload: { id: 'first-req-response' },
              meta: {
                ajax: {
                  url: 'http://localhost:7000/api/foos',
                  method: 'GET',
                  data: { page: 1 }
                }
              }
            },
            {
              type: 'SECOND_FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'GET',
                data: { id: 'first-req-response', page: 2 }
              }
            },
            {
              type: 'SECOND_FOO_SUCCESS',
              payload: { id: 'second-req-response' },
              meta: {
                ajax: {
                  url: 'http://localhost:7000/api/foos',
                  method: 'GET',
                  data: { id: 'first-req-response', page: 2 }
                }
              }
            },
            {
              type: 'THIRD_FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'GET',
                data: { id: 'second-req-response', page: 3 }
              }
            },
            {
              type: 'THIRD_FOO_SUCCESS',
              payload: { id: 'third-req-response' },
              meta: {
                ajax: {
                  url: 'http://localhost:7000/api/foos',
                  method: 'GET',
                  data: { id: 'second-req-response', page: 3 }
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

  describe('defaults', () => {
    it('should use default retries by request method', done => {
      setupStore({
        requestSuffix: 'REQUEST',
        retries: { GET: 1 },
      });

      requests.firstFailingRequest = nock('http://localhost:7000')
        .get('/api/foos')
        .reply(500, 'Oops!');

      requests.successfullRequest = nock('http://localhost:7000')
        .get('/api/foos')
        .reply(200, ['foos']);

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos',
          method: 'GET',
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('firstFailingRequest');
          expectToHaveMade('successfullRequest');

          const actions = store.getState();
          expect(actions).to.deep.equal([
            { type: '@@redux/INIT' },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'GET',
              }
            },
            {
              type: 'FOO_SUCCESS',
              payload: ['foos'],
              meta: {
                ajax: {
                  url: 'http://localhost:7000/api/foos',
                  method: 'GET',
                }
              }
            }
          ]);
          done();
        },
        30
      );
    });

    it('should use default timeout', done => {
      setupStore({
        requestSuffix: 'REQUEST',
        timeout: 15
      });

      requests.timeoutRequest = nock('http://localhost:7000')
        .post('/api/foos', { foo: { bar: 'shoot' } })
        .socketDelay(16)
        .reply(204);

      store.dispatch({
        type: 'FOO_REQUEST',
        ajax: {
          url: 'http://localhost:7000/api/foos',
          method: 'POST',
          data: { foo: { bar: 'shoot' } },
        }
      });

      setTimeout(
        () => {
          expectToHaveMade('timeoutRequest');

          const actions = store.getState();
          expect(actions).to.deep.equal([
            { type: '@@redux/INIT' },
            {
              type: 'FOO_REQUEST',
              ajax: {
                url: 'http://localhost:7000/api/foos',
                method: 'POST',
                data: { foo: { bar: 'shoot' } },
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
});

function expectToHaveMade(req) {
  expect(requests[req].isDone()).to.eq(true, req + ' should have been made');
}

function expectNotToHaveMade(req) {
  expect(requests[req].isDone()).to.eq(false, req + ' should not have been made');
}

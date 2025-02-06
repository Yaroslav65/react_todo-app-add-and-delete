/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import * as todoService from './api/todos';
import { Todo } from './types/Todo';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [counterTodos, setCounterTodos] = useState(0);
  const [counterCompletedTodos, setCounterCompletedTodos] = useState(0);
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [updatedTitle, setUpdatedTitle] = useState<string>('');
  const [loadingTodoId, setLoadingTodoId] = useState<number | number[] | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const editTodoRef = useRef<HTMLInputElement>(null);
  const timerId = useRef(0);

  const closeError = () => {
    window.clearTimeout(timerId.current);

    timerId.current = window.setTimeout(() => {
      setErrorMessage('');
    }, 3000);
  };

  const filteredTodos = todos.filter(todo => {
    if (status === 'active') {
      return !todo.completed;
    }

    if (status === 'completed') {
      return todo.completed;
    }

    return todo;
  });

  //#region useEffects

  useEffect(() => {
    if (inputRef.current !== null) {
      inputRef.current.focus();
    }

    // window.clearTimeout(timerId.current);

    todoService
      .getTodos()
      .then(todosComplete => {
        setTodos(todosComplete);
        const activeTodo = todosComplete.filter(todo => !todo.completed).length;

        setCounterTodos(activeTodo);
      })
      .catch(error => {
        {
          setErrorMessage('Unable to load todos');
          window.clearTimeout(timerId.current);
          closeError();
          throw error;
        }
      });
  }, []);

  useEffect(() => {
    const activeTodos = todos.filter(todo => !todo.completed).length;
    const completedTodos = todos.filter(todo => todo.completed).length;

    setCounterTodos(activeTodos);
    setCounterCompletedTodos(completedTodos);
  }, [todos]);

  useEffect(() => {
    if (editTodoRef.current !== null) {
      editTodoRef.current.focus();
    }
  }, [editingTodoId]);

  useEffect(() => {
    if (inputRef.current !== null && tempTodo === null) {
      inputRef.current.focus();
    }
  }, [tempTodo]);

  //#endregion

  //#region functions

  const addTodo = ({
    title,
    userId,
    completed,
  }: Omit<Todo, 'id'>): Promise<void> => {
    setErrorMessage('');
    setIsSubmitting(true);
    setTempTodo({ id: 0, title, userId, completed });
    setLoadingTodoId(0);

    return todoService
      .createTodo({ title, userId, completed })
      .then(newTodo => {
        setTodos(currentTodos => [...currentTodos, newTodo]);
        setLoadingTodoId(null);
        setTempTodo(null);
        setErrorMessage('');
      })
      .catch(error => {
        setTempTodo(null);
        setLoadingTodoId(null);
        setErrorMessage('Unable to add a todo');
        window.clearTimeout(timerId.current);
        closeError();
        throw error;
      })
      .finally(() => setIsSubmitting(false));
  };

  const checkModalActive = (todo: Todo): string => {
    if (loadingTodoId === todo.id) {
      return 'modal overlay is-active';
    }

    if (
      loadingTodoId !== null &&
      Array.isArray(loadingTodoId) &&
      loadingTodoId.includes(todo.id)
    ) {
      return 'modal overlay is-active';
    }

    return 'modal overlay';
  };

  const isTempTodoLoading = () => tempTodo !== null && loadingTodoId === 0;

  const startEditTodo = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setUpdatedTitle(todo.title);
  };

  const handleDeleteTodo = (todoId: number) => {
    setErrorMessage('');
    setLoadingTodoId(todoId);
    const previousTodos = [...todos];

    todoService
      .deleteTodo(todoId)
      .then(() => {
        setTodos(currentTodos =>
          currentTodos.filter(todo => todo.id !== todoId),
        );

        if (inputRef.current !== null) {
          inputRef.current.focus();
        }

        setErrorMessage('');
      })
      .catch(error => {
        setTodos(previousTodos);
        setErrorMessage('Unable to delete a todo');
        setLoadingTodoId(null);
        window.clearTimeout(timerId.current);
        closeError();
        throw error;
      })
      .finally(() => setLoadingTodoId(null));
  };

  const changeTitleTodo = (selectedTodo: Todo) => {
    setErrorMessage('');
    setLoadingTodoId(selectedTodo.id);

    if (updatedTitle === selectedTodo.title) {
      setLoadingTodoId(null);
      setEditingTodoId(null);

      return;
    }

    if (updatedTitle.trim() === '') {
      setLoadingTodoId(selectedTodo.id);
      handleDeleteTodo(selectedTodo.id);
    } else {
      todoService
        .updateTodo({
          ...selectedTodo,
          title: updatedTitle,
        })
        .then(updatedTodo => {
          setTodos(currentTodos => {
            return currentTodos.map(todo =>
              todo.id === updatedTodo.id ? updatedTodo : todo,
            );
          });
          setErrorMessage('');
        })
        .catch(error => {
          setEditingTodoId(selectedTodo.id);
          setErrorMessage('Unable to update a todo');
          window.clearTimeout(timerId.current);
          closeError();
          throw error;
        })
        .finally(() => setLoadingTodoId(null));
    }

    setEditingTodoId(null);
  };

  const handleQueryChanged = (newValue: string) => {
    setQuery(newValue);
  };

  const handleUpdateTodo = (selectedTodo: Todo) => {
    setErrorMessage('');
    setLoadingTodoId(selectedTodo.id);
    todoService
      .updateTodo(selectedTodo)
      .then(() => {
        setTodos(() => {
          const newTodos = todos.map(todo =>
            todo.id === selectedTodo.id ? selectedTodo : todo,
          );

          return newTodos;
        });
        setErrorMessage('');
      })
      .catch(error => {
        setErrorMessage('Unable to update a todo');
        window.clearTimeout(timerId.current);
        closeError();
        throw error;
      })
      .finally(() => setLoadingTodoId(null));
  };

  const handleCompleteAllTodo = () => {
    setErrorMessage('');
    const hasNoCompletedTodos = todos.some(todo => !todo.completed);
    const newCompletionState = hasNoCompletedTodos ? true : false;
    const hasTodosId = todos.map(todo => todo.id);

    setLoadingTodoId(hasTodosId);

    Promise.all(
      todos.map(todo =>
        todoService.updateTodo({ ...todo, completed: newCompletionState }),
      ),
    )
      .then(todosComplete => {
        const newTodos = todosComplete.flat();

        setTodos(newTodos);
        setLoadingTodoId(null);
        setErrorMessage('');
      })
      .catch(error => {
        setErrorMessage('Unable to update a todo');
        window.clearTimeout(timerId.current);
        closeError();
        throw error;
      });
  };

  const clearCompleted = () => {
    setErrorMessage('');
    const completedTodos = todos.filter(todo => todo.completed);

    if (completedTodos.length === 0) {
      return;
    }

    setLoadingTodoId(completedTodos.map(todo => todo.id));

    Promise.allSettled(
      completedTodos.map(todo => todoService.deleteTodo(todo.id)),
    )
      .then(results => {
        const failedTodos = completedTodos.filter(
          (_, index) => results[index].status === 'rejected',
        );

        setTodos(currentTodos =>
          currentTodos.filter(
            todo =>
              !todo.completed ||
              failedTodos.some(failed => failed.id === todo.id),
          ),
        );

        if (inputRef.current !== null) {
          inputRef.current.focus();
        }

        if (failedTodos.length > 0) {
          setErrorMessage('Unable to delete a todo');
          window.clearTimeout(timerId.current);
          closeError();
        }
      })
      .finally(() => {
        setLoadingTodoId(null);
      });
  };

  const reset = () => {
    setQuery('');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setErrorMessage('');
    event.preventDefault();

    if (!query.trim()) {
      setErrorMessage('Title should not be empty');
      closeError();

      return;
    }

    addTodo({
      title: query.trim(),
      userId: todoService.USER_ID,
      completed: false,
    })
      .then(reset)
      .catch(error => {
        window.clearTimeout(timerId.current);
        closeError();
        throw error;
      });
  };

  //#endregion

  if (!todoService.USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {todos.length !== 0 && (
            <button
              type="button"
              className={
                counterCompletedTodos === todos.length
                  ? 'todoapp__toggle-all active'
                  : 'todoapp__toggle-all'
              }
              data-cy="ToggleAllButton"
              onClick={handleCompleteAllTodo}
            />
          )}

          <form onSubmit={handleSubmit}>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              ref={inputRef}
              value={query}
              onChange={event => {
                handleQueryChanged(event.target.value);
              }}
              disabled={isSubmitting}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {filteredTodos.map(todo => (
            <div
              data-cy="Todo"
              className={todo.completed ? 'todo completed' : 'todo'}
              key={todo.id}
            >
              <label className="todo__status-label">
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={todo.completed}
                  onChange={() => {
                    handleUpdateTodo(
                      todo.completed === false
                        ? { ...todo, completed: true }
                        : { ...todo, completed: false },
                    );
                  }}
                />
              </label>

              {editingTodoId === todo.id ? (
                <form>
                  <input
                    data-cy="TodoTitleField"
                    type="text"
                    className="todo__title-field"
                    placeholder="Empty todo will be deleted"
                    value={updatedTitle}
                    onChange={event => setUpdatedTitle(event.target.value)}
                    onBlur={() => {
                      changeTitleTodo(todo);
                    }}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        changeTitleTodo(todo);
                      }

                      if (event.key === 'Escape') {
                        setEditingTodoId(null);
                      }
                    }}
                    ref={editTodoRef}
                  />
                </form>
              ) : (
                <>
                  <span
                    data-cy="TodoTitle"
                    className="todo__title"
                    onDoubleClick={() => {
                      startEditTodo(todo);
                    }}
                  >
                    {todo.title}
                  </span>
                  <button
                    type="button"
                    className="todo__remove"
                    data-cy="TodoDelete"
                    onClick={() => {
                      handleDeleteTodo(todo.id);
                    }}
                  >
                    ×
                  </button>
                </>
              )}

              <div data-cy="TodoLoader" className={checkModalActive(todo)}>
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          ))}

          {tempTodo && (
            <div
              data-cy="Todo"
              className={`todo ${isTempTodoLoading() ? 'is-loading' : ''}`}
            >
              <input
                data-cy="TodoStatus"
                type="checkbox"
                className="todo__status"
                checked={tempTodo.completed}
                disabled
              />
              <span data-cy="TodoTitle" className="todo__title">
                {tempTodo.title}
              </span>
              {isTempTodoLoading() && (
                <div data-cy="TodoLoader" className="modal overlay is-active">
                  <div className="modal-background has-background-white-ter" />
                  <div className="loader" />
                </div>
              )}
            </div>
          )}
        </section>

        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {counterTodos} items left
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={
                  status === 'all' ? 'filter__link selected' : 'filter__link'
                }
                data-cy="FilterLinkAll"
                onClick={() => {
                  setStatus('all');
                }}
              >
                All
              </a>

              <a
                href="#/active"
                className={
                  status === 'active' ? 'filter__link selected' : 'filter__link'
                }
                data-cy="FilterLinkActive"
                onClick={() => {
                  setStatus('active');
                }}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={
                  status === 'completed'
                    ? 'filter__link selected'
                    : 'filter__link'
                }
                data-cy="FilterLinkCompleted"
                onClick={() => {
                  setStatus('completed');
                }}
              >
                Completed
              </a>
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={counterCompletedTodos === 0}
              onClick={clearCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={
          errorMessage === ''
            ? 'notification is-danger is-light has-text-weight-normal hidden'
            : 'notification is-danger is-light has-text-weight-normal'
        }
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setErrorMessage('')}
        />
        {errorMessage}
      </div>
    </div>
  );
};

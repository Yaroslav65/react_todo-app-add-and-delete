/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import * as todoService from './api/todos';
import { Todo } from './types/Todo';
import { Header } from './components/Header/Header';
import { TodoList } from './components/TodoList/TodoList';
import { Footer } from './components/Footer/Footer';
import { ErrorNotification } from './components/Error/ErrorNotification';

export enum Status {
  All = 'all',
  Active = 'active',
  Completed = 'completed',
}

export const App: React.FC<Status> = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [status, setStatus] = useState(Status.All);
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
    if (status === Status.Active) {
      return !todo.completed;
    }

    if (status === Status.Completed) {
      return todo.completed;
    }

    return todo;
  });

  //#region useEffects

  useEffect(() => {
    if (inputRef.current !== null) {
      inputRef.current.focus();
    }

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
        <Header
          todos={todos}
          query={query}
          isSubmitting={isSubmitting}
          inputRef={inputRef}
          counterCompletedTodos={counterCompletedTodos}
          handleCompleteAllTodo={handleCompleteAllTodo}
          handleQueryChanged={handleQueryChanged}
          handleSubmit={handleSubmit}
        />

        <TodoList
          filteredTodos={filteredTodos}
          tempTodo={tempTodo}
          editTodoRef={editTodoRef}
          editingTodoId={editingTodoId}
          updatedTitle={updatedTitle}
          setUpdatedTitle={setUpdatedTitle}
          setEditingTodoId={setEditingTodoId}
          changeTitleTodo={changeTitleTodo}
          handleUpdateTodo={handleUpdateTodo}
          startEditTodo={startEditTodo}
          handleDeleteTodo={handleDeleteTodo}
          checkModalActive={checkModalActive}
          isTempTodoLoading={isTempTodoLoading}
        />

        {todos.length > 0 && (
          <Footer
            counterTodos={counterTodos}
            status={status}
            setStatus={setStatus}
            counterCompletedTodos={counterCompletedTodos}
            clearCompleted={clearCompleted}
          />
        )}
      </div>

      <ErrorNotification
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
      />
    </div>
  );
};

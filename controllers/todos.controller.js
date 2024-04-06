// todoController.js
import { asyncHandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { Todo } from '../modals/todo.modal.js';
import ApiResponse from '../utils/ApiResponse.js';

const createTodo = asyncHandler(async (req, res) => {
  try {
    const { title, description } = req.body;
    const createdBy = req.user._id; // Assuming user information is available in the request after authentication

    // validation - not empty
    if (!title || !description || !createdBy) {
      throw new ApiError(400, "All fields are required");
    }

    // Create a new Todo
    const newTodo = await Todo.create({
      title,
      description,
      createdBy,
    });

    if (!newTodo) {
      throw new ApiError(500, "Something went wrong while creating todo");
    }

    return res.status(201).json(
      new ApiResponse(201, newTodo, "Todo Created Successfully")
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// todoController.js
const getTodosByUser = asyncHandler(async (req, res) => {
  try {
    const createdBy = req.user._id;

    // Fetch all todos for the user
    const todos = await Todo.find({ createdBy });

    if(!todos){
      console.log("Empty");
      return ;
    }

    return res.status(200).json(
      new ApiResponse(200, todos, "Todos Retrieved Successfully")
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const getTodo = asyncHandler(async (req, res) => {
  try {
    const todoId = req.params.todoId;
    const createdBy = req.user._id; // Assuming user information is available in the request after authentication

    // Fetch the todo for the user
    const todo = await Todo.findOne({ _id: todoId, createdBy });

    if (!todo) {
      throw new ApiError(404, 'Todo not found');
    }

    return res.status(200).json(
      new ApiResponse(200, todo, 'Todo Retrieved Successfully')
    );
  } catch (error) {
    console.error(error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const updateTodo = asyncHandler(async (req, res) => {
  try {
    const todoId = req.params.todoId;
    const createdBy = req.user._id; // Assuming user information is available in the request after authentication

    // Check if the todo exists and is associated with the authenticated user
    const todoToUpdate = await Todo.findOne({ _id: todoId, createdBy });

    if (!todoToUpdate) {
      throw new ApiError(404, 'Todo not found');
    }

    // Update the todo
    todoToUpdate.title = req.body.title || todoToUpdate.title;
    todoToUpdate.description = req.body.description || todoToUpdate.description;
    // You can add more fields to update as needed

    // Save the updated todo
    const updatedTodo = await todoToUpdate.save();

    return res.status(200).json(
      new ApiResponse(200, updatedTodo, 'Todo Updated Successfully')
    );
  } catch (error) {
    console.error(error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const deleteTodo = async (req, res) => {
  try {
    const todoId = req.params.todoId;
    const createdBy = req.user._id; // Assuming user information is available in the request after authentication

    // Check if the todo exists and is associated with the authenticated user
    const todoToDelete = await Todo.findOne({ _id: todoId, createdBy });

    if (!todoToDelete) {
      throw new ApiError(404, 'Todo not found');
    }

    // Ensure that todoToDelete is a Mongoose model instance
    if (!todoToDelete instanceof Todo) {
      throw new ApiError(500, 'Internal Server Error: Invalid todoToDelete object');
    }

    // Delete the todo using the deleteOne method
    await Todo.deleteOne({ _id: todoId, createdBy });

    return res.status(204).end(); // No content (successful deletion)
  } catch (error) {
    console.error(error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


export { createTodo ,getTodosByUser,updateTodo,deleteTodo,getTodo };



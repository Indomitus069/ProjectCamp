const Note = require("../models/Note");
const ApiResponse = require("../utils/apiResponse");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

const createNote = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, content } = req.body;
  const { userId } = req.auth;

  if (!title || !content) {
    throw new ApiError(400, "Title and content are required");
  }

  const note = await Note.create({
    projectId,
    title,
    content,
    createdBy: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, note, "Note created successfully"));
});

const getNotes = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const notes = await Note.find({ projectId });

  return res
    .status(200)
    .json(new ApiResponse(200, notes, "Notes fetched successfully"));
});

const updateNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  const { title, content } = req.body;

  const note = await Note.findByIdAndUpdate(
    noteId,
    { title, content },
    { new: true, runValidators: true }
  );

  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, note, "Note updated successfully"));
});

const deleteNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  const note = await Note.findByIdAndDelete(noteId);

  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Note deleted successfully"));
});

module.exports = {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
};

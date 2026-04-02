import Question from "../models/question.model.js";
import Product from "../models/products.model.js";

// Ask a question on a product
const addQuestion = async (req, res) => {
  try {
    const { productId, questionText } = req.body;

    if (!productId || !questionText) {
      return res.status(400).json({ message: "Product ID and question are required" });
    }

    const question = await Question.create({
      user: req.user._id,
      product: productId,
      question: questionText,
    });

    const populatedQuestion = await Question.findById(question._id).populate("user", "firstName lastName image");

    res.status(201).json({ message: "Question posted successfully", question: populatedQuestion });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error posting question" });
  }
};

// Answer a question
const answerQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { answerText } = req.body;

    if (!answerText) {
      return res.status(400).json({ message: "Answer is required" });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    question.answers.push({
      user: req.user._id,
      answer: answerText,
    });

    await question.save();

    const updatedQuestion = await Question.findById(questionId)
      .populate("user", "firstName lastName image")
      .populate("answers.user", "firstName lastName image role");

    res.status(200).json({ message: "Answer posted successfully", question: updatedQuestion });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error posting answer" });
  }
};

// Get all questions for a product
const getProductQuestions = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const questions = await Question.find({ product: productId })
      .populate("user", "firstName lastName image")
      .populate("answers.user", "firstName lastName image role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Question.countDocuments({ product: productId });

    res.status(200).json({
      questions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error fetching questions" });
  }
};

// Delete a question (author or admin)
const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const question = await Question.findById(questionId);

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    if (question.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this question" });
    }

    await Question.findByIdAndDelete(questionId);
    res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message, message: "Error deleting question" });
  }
};

export { addQuestion, answerQuestion, getProductQuestions, deleteQuestion };

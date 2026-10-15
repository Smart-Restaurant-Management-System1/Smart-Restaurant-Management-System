/**
 * Feedback validation helper for SR-219 / SR-236.
 */

export const sanitizeFeedbackComment = (comment) => {
  if (!comment || typeof comment !== 'string') return '';
  return comment.replace(/<[^>]*>?/gm, '').trim();
};

export const validateFeedback = ({ rating, comment }) => {
  const errors = {};

  const numRating = Number(rating);
  if (!numRating || !Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    errors.rating = 'Please select a rating between 1 and 5 stars.';
  }

  const cleanedComment = sanitizeFeedbackComment(comment);

  if (numRating && numRating <= 3) {
    if (!cleanedComment) {
      errors.comment = 'Please provide a comment (at least 5 characters) to help us understand how we can improve.';
    } else if (cleanedComment.length < 5) {
      errors.comment = 'Comment must be at least 5 characters long.';
    }
  }

  if (cleanedComment && cleanedComment.length > 1000) {
    errors.comment = 'Comment cannot exceed 1000 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedComment: cleanedComment,
  };
};

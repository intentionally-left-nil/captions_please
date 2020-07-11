const sanitize = (paragraphs) => {
  paragraphs = paragraphs.map((paragraph) => paragraph.trim());
  return paragraphs.length > 0 ? paragraphs : null;
};

module.exports = { sanitize };

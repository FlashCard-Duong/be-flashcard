const express = require("express");
const PostController = require("../controllers/postController");
const { check } = require("express-validator");
const tokenHandler = require("../middlewares/token-handler");

const router = express.Router();

// routes need access token
router.use(tokenHandler.verifyAccessToken);

router.get("/", PostController.getHomePosts);
router.get("/saved", PostController.getSavedPosts);

router.post(
  "/",
  [
    check("flash_card").custom((value, { req }) => {
      const { flashCards } = req.body;

      if (
        !flashCards ||
        flashCards.length === 0
      ) {
        throw new Error("Không có câu hỏi!");
      }

      return true;
    }),
  ],
  PostController.createPost
);


router.post(
  "/:postId",
  [check("save").isBoolean().withMessage("Trường save phải là boolean!")],
  PostController.savePost
);

router.delete("/:postId", PostController.deletePost);

module.exports = router;
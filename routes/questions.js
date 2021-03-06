const express = require('express');
const Question = require('../models/question');
const User = require('../models/user'); 
const Answer = require('../models/answer'); 
const catchErrors = require('../lib/async-error');


const router = express.Router();

// 동일한 코드가 users.js에도 있습니다. 이것은 나중에 수정합시다.
function needAuth(req, res, next) {
    if (req.session.user) {
      next();
    } else {
      req.flash('danger', 'Please signin first.');
      res.redirect('/signin');
    }
}

function validateForm(form, options) {
  var title = form.title || "";
  var content = form.content || "";
  title = title.trim();
  content = content.trim();

  if (!name) {
    return 'Name is required.';
  }

  if (!email) {
    return 'Email is required.';
  }
 
  return null;
}



router.get('/myWrite/:id', needAuth, catchErrors(async (req, res, next) => {
  console.log('Hello')
  const page = parseInt(req.query.page) || 1;
  const limit = 8; 
  var query = {author: req.params.id}; // 원하는 쿼리를 여기다 주면 그 쿼리에 해당된 데이터만 넘어감.
  var questions = await Question.paginate(query, {
    sort: {createdAt: -1}, // 이걸로 정렬하겠다.
    page: page, 
    limit: limit 
  });

  res.render('questions/myWrite', {questions: questions, query: req.query, user:req.user}); // 현 사용자의 이벤트 다 넘김
}));


/* GET questions listing. */
router.get('/', catchErrors(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  var query = {};
  const term = req.query.term;
  if (term) {
    query = {$or: [
      {title: {'$regex': term, '$options': 'i'}},
      {content: {'$regex': term, '$options': 'i'}},
      {location: {'$regex': term, '$options': 'i'}},
      {start_date: {'$regex': term, '$options': 'i'}},
      {finish_date: {'$regex': term, '$options': 'i'}},
      {event_categories: {'$regex': term, '$options': 'i'}}
    ]};
  }
  const questions = await Question.paginate(query, {
    sort: {createdAt: -1}, 
    populate: 'author', 
    page: page, limit: limit
  });
  res.render('questions/index', {questions: questions, term: term});
}));

router.get('/new', needAuth, (req, res, next) => {  
  res.render('questions/new', {question: {}});
});

router.get('/:id/edit', needAuth, catchErrors(async (req, res, next) => {
  const question = await Question.findById(req.params.id);
  res.render('questions/edit', {question: question});
}));

router.get('/:id', catchErrors(async (req, res, next) => {
  const question = await Question.findById(req.params.id).populate('author');
  const answers = await Answer.find({question: question.id}).populate('author');
  question.numReads++;    // TODO: 동일한 사람이 본 경우에 Read가 증가하지 않도록???
  await question.save();
  res.render('questions/show', {question: question, answers: answers});
}));


router.put('/:id', catchErrors(async (req, res, next) => {
  const question = await Question.findById(req.params.id);

  if (!question) {
    req.flash('danger', 'Not exist question');
    return res.redirect('back');
  }
  question.title = req.body.title;
  question.content = req.body.content;
  question.tags = req.body.tags.split(" ").map(e => e.trim());
  console.log(1);
  await question.save();
  req.flash('success', 'Successfully updated');
  res.redirect('/questions');
}));

router.delete('/:id', needAuth, catchErrors(async (req, res, next) => {
  await Question.findOneAndRemove({_id: req.params.id});
  req.flash('success', 'Successfully deleted');
  res.redirect('/questions');
}));

router.post('/', needAuth, catchErrors(async (req, res, next) => {
  const user = req.session.user;
  var question = new Question({
    title: req.body.title,
    author: user._id,
    content: req.body.content,
    location: req.body.location,
    organization: req.body.Organization,
    org_description: req.body.orgDescription,
    start_date: req.body.startDate,
    finish_date: req.body.finishDate,
    event_area: req.body.eventArea,
    event_categories: req.body.categories,
    event_area: req.body.eventArea,
    fee: req.body.eventFee,
    price: req.body.price,
    limitNum: req.body.limitNum,
    tags: req.body.tags.split(" ").map(e => e.trim()),
  });
  await question.save();
  req.flash('success', 'Successfully posted');
  res.redirect('/questions');
}));

router.post('/:id/answers', needAuth, catchErrors(async (req, res, next) => {
  const user = req.session.user;
  const question = await Question.findById(req.params.id);

  if (!question) {
    req.flash('danger', 'Not exist question');
    return res.redirect('back');
  }

  var answer = new Answer({
    author: user._id,
    question: question._id,
    content: req.body.content
  });
  await answer.save();
  question.numAnswers++;
  await question.save();

  req.flash('success', 'Successfully answered');
  res.redirect(`/questions/${req.params.id}`);
}));



module.exports = router;

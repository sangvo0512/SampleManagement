const express = require('express');
const router = express.Router();
const BorrowerController = require('../controllers/BorrowerController');

router.get('/', BorrowerController.getAllBorrowers);
router.get('/:cardID', BorrowerController.getBorrowerByCardID);
router.post('/', BorrowerController.createBorrower);
router.put('/', BorrowerController.updateBorrower);
router.delete('/:cardID', BorrowerController.deleteBorrower);

module.exports = router;
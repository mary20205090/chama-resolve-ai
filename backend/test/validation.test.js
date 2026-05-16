import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCasePayload, validateUploadFile } from '../src/validation.js';

test('validateCasePayload accepts a valid dispute case', () => {
  const result = validateCasePayload({
    chamaName: 'Umoja Chama',
    disputeType: 'late_contribution',
    disputeDescription: 'A member paid their monthly contribution after the deadline and disputes the fine.',
    members: [' Amina ', 'Brian']
  });

  assert.equal(result.chamaName, 'Umoja Chama');
  assert.equal(result.disputeType, 'late_contribution');
  assert.deepEqual(result.members, ['Amina', 'Brian']);
});

test('validateCasePayload rejects short descriptions', () => {
  assert.throws(
    () =>
      validateCasePayload({
        chamaName: 'Umoja',
        disputeType: 'other',
        disputeDescription: 'Too short'
      }),
    /Invalid case payload/
  );
});

test('validateUploadFile accepts supported text files', () => {
  assert.doesNotThrow(() =>
    validateUploadFile(
      {
        originalname: 'contributions.csv',
        mimetype: 'text/csv',
        size: 500
      },
      1000
    )
  );
});

test('validateUploadFile rejects unsupported image files for MVP', () => {
  assert.throws(
    () =>
      validateUploadFile(
        {
          originalname: 'receipt.png',
          mimetype: 'image/png',
          size: 500
        },
        1000
      ),
    /Unsupported file type/
  );
});

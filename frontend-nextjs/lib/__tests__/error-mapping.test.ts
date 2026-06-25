import {
  coerceToDisplayString,
  extractApiErrorMessage,
  getApiErrorMessage,
} from '../error-mapping';

describe('error-mapping', () => {
  describe('extractApiErrorMessage', () => {
    it('extracts nested Atom API error bodies', () => {
      const payload = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to store uploaded document in LanceDB',
        },
      };

      expect(extractApiErrorMessage(payload)).toBe(
        'Failed to store uploaded document in LanceDB',
      );
    });

    it('extracts FastAPI detail wrappers', () => {
      const payload = {
        detail: {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Upload failed',
          },
        },
      };

      expect(extractApiErrorMessage(payload)).toBe('Upload failed');
    });

    it('handles string error fields', () => {
      expect(
        extractApiErrorMessage({ success: false, error: 'Service unavailable' }),
      ).toBe('Service unavailable');
    });
  });

  describe('coerceToDisplayString', () => {
    it('never returns raw objects for React rendering', () => {
      const value = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Upload failed' },
      };

      const result = coerceToDisplayString(value);
      expect(typeof result).toBe('string');
      expect(result).toBe('Upload failed');
    });
  });

  describe('getApiErrorMessage', () => {
    it('resolves axios errors with detail objects', () => {
      const error = {
        response: {
          status: 500,
          data: {
            detail: {
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message: 'File upload failed',
              },
            },
          },
        },
      };

      expect(getApiErrorMessage(error)).toBe('File upload failed');
    });
  });
});
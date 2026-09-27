import { isFormField } from './is-form-field';

const element = (html: string): Element => {
  const template = document.createElement('template');
  template.innerHTML = html;
  const found = template.content.firstElementChild;
  if (!found) throw new Error('No element');
  return found;
};

describe('isFormField', () => {
  it.each([
    '<input type="text">',
    '<input type="checkbox">',
    '<textarea></textarea>',
    '<select></select>',
    '<div contenteditable="true"></div>',
  ])('should recognise %s', (html) => {
    expect(isFormField(element(html))).toBe(true);
  });

  it('should recognise an element inside editable text', () => {
    const editable = element('<div contenteditable="true"><b>text</b></div>');

    expect(isFormField(editable.querySelector('b'))).toBe(true);
  });

  it.each(['<button></button>', '<div></div>', '<a href="/">link</a>'])(
    'should not take %s for a form field',
    (html) => {
      expect(isFormField(element(html))).toBe(false);
    },
  );

  it('should not take the document or a missing target for a form field', () => {
    expect(isFormField(document)).toBe(false);
    expect(isFormField(null)).toBe(false);
  });
});

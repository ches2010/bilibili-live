export function showMessage(text, isError = false) {
  const container = document.createElement('div');
  container.className = isError ? 'error' : 'success';
  container.textContent = text;
  container.style.padding = '10px';
  container.style.margin = '10px 0';
  container.style.borderRadius = '4px';
  container.style.color = isError ? 'red' : 'green';
  container.style.border = `1px solid ${isError ? '#ffcccc' : '#ccffcc'}`;

  document.querySelector('.container').prepend(container);
  setTimeout(() => container.remove(), 3000);
}

export function hideMessage() {
  document.querySelectorAll('.error, .success').forEach(el => el.remove());
}

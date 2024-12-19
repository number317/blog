function copyCode(elementId, button) {
  if (button.dataset?.copying === 'true') {
    return;
  }
  button.dataset.copying = 'true';
  const codeElement = document.getElementById(elementId);
  const codeText = codeElement.textContent;
  navigator.clipboard.writeText(codeText)
    .then(() => {
      button.setAttribute('title', 'copied');
      button.innerHTML = '<i class="fa fa-check"></i>';
      setTimeout(() => {
        button.setAttribute('title', 'copy');
        button.innerHTML = '<i class="fa fa-copy"></i>';
        button.dataset.copying = false;
      }, 3000);
    })
    .catch(err => {
      console.error("copy code error：", err);
    });
}

function addCodeCopyButton() {
  const codeBlocks = document.querySelectorAll('pre code');
  codeBlocks.forEach((codeBlock) => {
    if (!codeBlock.closest('.code-block')) {
      const id = `code-indented-${Math.random().toString(36).substring(2, 15)}`;
      codeBlock.setAttribute('id', id);
      const container = document.createElement('div');
      container.classList.add('code-block');
      container.classList.add('code-block-container-indented-added');
      const button = document.createElement('button');
      button.classList.add('copy-code-button');
      button.setAttribute('onclick', `copyCode('${id}', this)`);
      button.setAttribute('title', 'copy');
      button.innerHTML = '<i class="fa fa-copy"></i>';


      const preElement = codeBlock.parentNode;
      preElement.parentNode.insertBefore(container, preElement);
      container.appendChild(preElement);
      container.appendChild(button);
    }
  });
}

function addImagePreview() {
  const content = document.getElementById('content');
  // wait until window.Viewer is ready
  if (!window.Viewer) {
    setTimeout(addImagePreview, 1000);
    return;
  }
  const viewer = new Viewer(content, {
    toolbar: {
      zoomIn: { show: true },
      zoomOut: { show: true },
      oneToOne: { show: true },
      reset: { show: true },
      prev: { show: true },
      play: { show: true },
      next: { show: true },
      rotateLeft: { show: true },
      rotateRight: { show: true },
      flipHorizontal: { show: true },
      flipVertical: { show: true },
    },
    fullscreen: true,
  });
}

document.addEventListener('DOMContentLoaded', addCodeCopyButton);
document.addEventListener('DOMContentLoaded', addImagePreview);

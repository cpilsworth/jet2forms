export function submitSuccess(e, form) {
  const { payload } = e;
  if (payload?.body?.redirectUrl) {
    window.location.assign(encodeURI(payload.body.redirectUrl));
  } else {
    let thankYouMessage = form.querySelector('.form-message.success-message');
    if (!thankYouMessage) {
      thankYouMessage = document.createElement('div');
      thankYouMessage.className = 'form-message success-message';
    }
    thankYouMessage.innerHTML = payload?.body?.thankYouMessage || 'Thanks for your submission';
    form.prepend(thankYouMessage);
    if (thankYouMessage.scrollIntoView) {
      thankYouMessage.scrollIntoView({ behavior: 'smooth' });
    }
    form.reset();
  }
  form.setAttribute('data-submitting', 'false');
  form.querySelector('button[type="submit"]').disabled = false;
}

export function submitFailure(e, form) {
  let errorMessage = form.querySelector('.form-message.error-message');
  if (!errorMessage) {
    errorMessage = document.createElement('div');
    errorMessage.className = 'form-message error-message';
  }
  errorMessage.innerHTML = 'Some error occured while submitting the form'; // TODO: translation
  form.prepend(errorMessage);
  errorMessage.scrollIntoView({ behavior: 'smooth' });
  form.setAttribute('data-submitting', 'false');
  form.querySelector('button[type="submit"]').disabled = false;
}

function generateUnique() {
  return new Date().valueOf() + Math.random();
}

function includeInPayload(payload, field) {
  // disabled field should not be part of payload.
  if (field.name && !field.matches('button') && !field.disabled) {
    if (field.type === 'radio') {
      if (field.checked) payload[field.name] = field.value;
    } else if (field.type === 'checkbox') {
      if (field.checked) payload[field.name] = payload[field.name] ? `${payload[field.name]},${field.value}` : field.value;
    } else if (field.type !== 'file') {
      payload[field.name] = field.value;
    }
  }
  return payload;
}

export function constructPayload(form) {
  const payload = { __id__: generateUnique() };
  [...form.elements].forEach((field) => {
    if (field.matches('fieldset[data-repeatable]')) {
      payload[field.name] = (payload[field.name] || []).concat([
        [...field.elements].reduce((fdpayload, fd) => includeInPayload(fdpayload, fd), {}),
      ]);
    } else if (!field.closest('fieldset[data-repeatable]')) {
      includeInPayload(payload, field);
    }
  });
  return { payload };
}

async function prepareRequest(form) {
  const { payload } = constructPayload(form);
  const headers = {
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({ data: payload });
  const url = form.dataset.submit || form.dataset.action;
  return { headers, body, url };
}

async function submitDocBasedForm(form) {
  try {
    const { headers, body, url } = await prepareRequest(form);
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });
    if (response.ok) {
      submitSuccess(response, form);
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (error) {
    submitFailure(error, form);
  }
}

export async function handleSubmit(e, form) {
  e.preventDefault();
  const valid = form.checkValidity();
  if (valid) {
    e.submitter.setAttribute('disabled', '');
    if (form.getAttribute('data-submitting') !== 'true') {
      form.setAttribute('data-submitting', 'true');

      // hide error message in case it was shown before
      form.querySelectorAll('.form-message.show').forEach((el) => el.classList.remove('show'));

      if (form.dataset.src === 'sheet') {
        await submitDocBasedForm(form);
      }
    }
  } else {
    const firstInvalidEl = form.querySelector(':invalid:not(fieldset)');
    if (firstInvalidEl) {
      firstInvalidEl.focus();
      firstInvalidEl.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
(function () {
  'use strict';

  const accessFile = 'course-access.json';
  const lessonPattern = /MRECode_Student_Lesson_(\d{2})_[^/]+\.html$/;
  // Browsers block fetch() for file:// URLs. Keep this in sync with the
  // default published list so opening index.html directly still works.
  const localPreviewConfig = Object.freeze({ openLessons: [1, 2] });

  document.documentElement.classList.add('access-checking');

  function lessonNumberFromUrl(value) {
    const match = decodeURIComponent(value).match(lessonPattern);
    return match ? Number(match[1]) : null;
  }

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      html.access-checking body { visibility: hidden; }
      .idxcard.locked, a[data-lesson-locked="true"] { opacity: .58; cursor: not-allowed; }
      .idxcard.locked { background: #f1f3f7; }
      .idxcard.locked b { color: #657084; }
    `;
    document.head.append(style);
  }

  function showUnavailable() {
    document.title = 'الدرس غير متاح';
    document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f5f7fb;font-family:Segoe UI,Tahoma,Arial;text-align:center;color:#172033">
        <section style="max-width:500px;background:#fff;padding:32px;border-radius:20px;box-shadow:0 14px 38px rgba(20,34,66,.08)">
          <div style="font-size:42px">🔒</div><h1>الدرس غير متاح الآن</h1>
          <p>هذا الدرس لم يتم فتحه بعد. ارجع إلى قائمة الدروس أو تواصل مع المدرّس.</p>
          <a href="index.html" style="display:inline-block;margin-top:10px;padding:10px 16px;border-radius:10px;background:#2855d9;color:#fff;text-decoration:none;font-weight:700">قائمة الدروس</a>
        </section>
      </main>`;
  }

  function lockClosedLinks(openLessons) {
    document.querySelectorAll('a[href]').forEach((link) => {
      const lesson = lessonNumberFromUrl(link.getAttribute('href'));
      if (lesson === null || openLessons.has(lesson)) return;
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
      link.dataset.lessonLocked = 'true';
      link.addEventListener('click', (event) => event.preventDefault());
      if (link.classList.contains('idxcard')) {
        link.classList.add('locked');
        const indicator = link.querySelector('b');
        if (indicator) indicator.textContent = '🔒';
      }
    });
  }

  function updateLessonNavigation(currentLesson, openLessons, lessonFiles) {
    const navigation = document.querySelector('.mobile-nav');
    if (!navigation) return;

    const lessons = [...openLessons].sort((first, second) => first - second);
    const currentIndex = lessons.indexOf(currentLesson);
    const previousLesson = lessons[currentIndex - 1];
    const nextLesson = lessons[currentIndex + 1];
    const previousLink = navigation.querySelector('a:not(.primary)');
    const nextLink = navigation.querySelector('a.primary');
    const position = navigation.querySelector('span');

    if (previousLesson) {
      previousLink.href = lessonFiles[String(previousLesson).padStart(2, '0')];
      previousLink.textContent = 'الدرس السابق';
    } else {
      previousLink.href = 'index.html';
      previousLink.textContent = 'قائمة الدروس';
    }

    if (nextLesson) {
      nextLink.href = lessonFiles[String(nextLesson).padStart(2, '0')];
      nextLink.textContent = 'الدرس التالي';
    } else {
      nextLink.href = 'index.html';
      nextLink.textContent = 'قائمة الدروس';
    }

    if (position) position.textContent = `${currentIndex + 1} / ${lessons.length}`;
  }

  async function applyAccessRules() {
    addStyles();
    try {
      const config = window.location.protocol === 'file:'
        ? localPreviewConfig
        : await fetchAccessConfig();
      if (!Array.isArray(config.openLessons)) throw new Error('Invalid access list.');
      const openLessons = new Set(config.openLessons.filter((lesson) =>
        Number.isInteger(lesson) && Object.hasOwn(config.lessonFiles || {}, String(lesson).padStart(2, '0')),
      ));
      const currentLesson = lessonNumberFromUrl(window.location.pathname);
      if (currentLesson !== null && !openLessons.has(currentLesson)) {
        showUnavailable();
      } else {
        if (currentLesson !== null) updateLessonNavigation(currentLesson, openLessons, config.lessonFiles);
        lockClosedLinks(openLessons);
      }
    } catch (error) {
      console.error('Could not load course-access.json.', error);
      showUnavailable();
    } finally {
      document.documentElement.classList.remove('access-checking');
    }
  }

  async function fetchAccessConfig() {
    const response = await fetch(accessFile, { cache: 'no-store' });
    if (!response.ok) throw new Error('Access list was not found.');
    return response.json();
  }

  applyAccessRules();
}());

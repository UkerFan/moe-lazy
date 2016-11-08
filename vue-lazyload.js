
if (!Array.prototype.$remove) {
  Array.prototype.$remove = function (item) {
    if (!this.length) return;
    const index = this.indexOf(item);
    if (index > -1) {
      return this.splice(index, 1);
    }
  }
}

export default (Vue, Options = {}) => {
  const DEFAULT_URL = 'data:img/jpg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEXs7Oxc9QatAAAACklEQVQI12NgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==';

  const Init = {
    preLoad: Options.preLoad || 1.3,
    error: Options.error || DEFAULT_URL,
    loading: Options.loading || DEFAULT_URL,
    attempt: Options.attempt || 3,
    zoom: Options.zoom || 1
  };

  const Listeners = [];
  const imageCache = [];

  // 节流
  const throttle = function (action, delay) {
    let timeout = null;
    let lastRun = 0;
    return function () {
      if (timeout) {
        return;
      }
      let elapsed = (+new Date()) - lastRun;
      let context = this;
      let args = arguments;
      let runCallback = function () {
        lastRun = +new Date();
        timeout = false;
        action.apply(context, args);
      };
      if (elapsed >= delay) {
        runCallback();
      }
      else {
        timeout = setTimeout(runCallback, delay);
      }
    }
  };

  const lazyLoadHandler = throttle(() => {
    for (let i = 0, len = Listeners.length; i < len; ++i) {
      checkCanShow(Listeners[i]);
    }
  }, 300);

  const onListen = () => {
    window.addEventListener('scroll', lazyLoadHandler);
    window.addEventListener('wheel', lazyLoadHandler);
    window.addEventListener('mousewheel', lazyLoadHandler);
    window.addEventListener('resize', lazyLoadHandler);
    window.addEventListener('animationend', lazyLoadHandler);
    window.addEventListener('transitionend', lazyLoadHandler);
  };

  const checkCanShow = (listener) => {
    if (imageCache.indexOf(listener.src) > -1) {
      console.log('read cache');
      console.log('read cache');
      return setElRender(listener.el, listener.src, 'loaded');
    }
    let rect = listener.el.getBoundingClientRect();
    if ((rect.top < window.innerHeight * Init.preLoad && rect.bottom > 0) && (rect.left < window.innerWidth * Init.preLoad / Init.zoom && rect.right > 0)) {
      render(listener);
    }
  };

  const setElRender = (el, src, state) => {
    el.setAttribute('src', src);
    el.setAttribute('lazy', state);
  };

  const render = (item) => {
    // 尝试次数, 都失败的话放弃
    if (item.attempt >= Init.attempt) return false;
    item.attempt++;
    let image = new Image();
    image.src = item.src;

    image.onload = function () {
      setElRender(item.el, item.src, 'loaded');
      imageCache.push(item.src);
      Listeners.$remove(item);
    };
    image.onerror = function () {
      setElRender(item.el, item.error, 'error');
    };
  };

  const componentBind = () => {
    onListen();
    lazyLoadHandler();
  };

  const componentUnBind = (el) => {
    if (!el) return;
    Listeners.forEach((item, index) => {
      if (item.el === el) {
        Listeners.splice(index, 1);
        return;
      }
    });
  };

  const checkElExist = (el) => {
    let hasIt = false;

    Listeners.forEach((item) => {
      if (item.el === el) hasIt = true;
    });

    if (hasIt) {
      Vue.nextTick(() => {
        lazyLoadHandler();
      })
    }
    return hasIt;
  };

  const addListener = (el, binding) => {
    if (el.getAttribute('lazy') === 'loaded') return;
    if (checkElExist(el)) return;

    let imageSrc = binding.value;
    let imageLoading = Init.loading;
    let imageError = Init.error;

    if (typeof(binding.value) !== 'string' && binding.value) {
      imageSrc = binding.value.src;
      imageLoading = binding.value.loading || Init.loading;
      imageError = binding.value.error || Init.error;
    }

    setElRender(el, imageLoading, 'loading');

    Vue.nextTick(() => {
      Listeners.push({
        attempt: 0,
        el: el,
        error: imageError,
        src: imageSrc
      });
      lazyLoadHandler();
    });
  };


  Vue.directive('lazy', {
    bind: componentBind,
    update (newValue) {
      addListener(this.el, {
        arg: this.arg,
        value: newValue
      });
    },
    unbind () {
      componentUnBind(this.el);
    }
  })
}
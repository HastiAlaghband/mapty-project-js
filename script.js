import 'core-js/stable';
import 'regenerator-runtime/runtime';

/** parent class to manage data about workouts(running & cycling) - take in the data common to both workout types
 */
class Workout {
  date = new Date();
  // using Date.now(current time stamp) to create a new ID, convert it to string and take 10 last numbers
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  /**
   *
   * @param {array} coords the point clicked on the map [lat, lng]
   * @param {number} distance to be entered on the form in km
   * @param {number} duration to be entered on the form in min
   */
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  /**
   * Display the description on the pin when a workout gets generated
   * @return {string} 'e.g: Activity on October 31'
   */
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

// note we will never directly create a workout, instead either a running or cycling object
// ————————————————————————
// CHILD CLASSES

/**
 * Class to create a running workout object (child class of Workout)
 * @extends Workout
 * @return {object} creates a running object
 * @param {array} coords extending from parent class(Workout)
 * @param {number} distance extending from parent class(Workout)
 * @param {number} duration extending from parent class(Workout)
 * @param {number} cadence steps/min to be entered on the form
 *
 */
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace(); // using the constructor to immediately calculate the pace
    this._setDescription();
  }
  /**
   * Calculating the pace, using the constuctor to immediately calculate it
   * @returns {number} result of min/km
   */
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

/**
 * Class to create a cycling workout object (child class of Workout)
 * @extends Workout
 * @param {number} elevation gain in meters to be entered on the form input field
 */
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }

  /**
   * Calculating the speed, using the distance & duration of the workout
   * @returns {number} speed in km/h
   */
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// APPLICATION'S ARCHITECTURE

// ELEMENTS
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  // private instance properties - present on all instances created through this class
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // note constructor method is called immediately when a new object is created from this class

    // Get user's position - trigger the geolocation API
    this._getPosition(); // this = current object

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    // because the constructor automatically gets called as soon as the script loads, we attach our event listeners to the DOM elements in the constructor so they are added in the beginning
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this)); // Show workout on map when clicking on list
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    // My current location
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    // Render markers on the map after reloading the page & getting data from local storage
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // Looks like form was replaced with an activity instead of jumping to change (the animation) so Hide the form immediately first
    form.style.display = 'none';

    // Add hidden class back
    form.classList.add('hidden');

    // then set the display property back after 1s (the time of animation)
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is running, create a running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling, create a cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render new workout on map as a marker
    this._renderWorkoutMarker(workout);

    // Render new workout on the list
    this._renderWorkout(workout);

    // Hide the form + Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}
`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
       <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
        `;
    // instert it as a sibling element at the end of the form
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    // if there is no workout element
    if (!workoutEl) return;

    // get the workout data out of the workouts array
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // get coordinates from the element & then move the map to that position
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the Public Interface
    // calling methods outside of the classes themselves
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    // Check if there's data
    if (!data) return;

    // Restore our workouts array
    this.#workouts = data;

    // Render data in the list
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  // Add a method to the public interface of the class!

  // Remove workouts from local storage
  reset() {
    localStorage.removeItem('workouts');

    // Reload page programmatically and application will look completely empty - app.reset() in the console
    location.reload();
  }
}

const app = new App();

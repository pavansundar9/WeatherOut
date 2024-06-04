const searchCity = document.getElementById('search-city');
const searchButton = document.getElementById('search-button');
const clearHistoryBtn = document.getElementById('clear-history');

const currentCity = document.getElementById('current-city');
const temperature = document.getElementById('temperature');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const uvIndex = document.getElementById('uv-index');

const forecastDays = document.getElementById('forecast-days');

const weatherIconElement = document.getElementById('weather-icon');

const currentDate = document.getElementById('current-date');

const errorMessage = document.getElementById('error-message');

const discription = document.getElementById('discription');

const listGroup = document.querySelector('.list-group');

const windRoseCanvas = document.getElementById('windRoseCanvas');

// API Key
const apiKey = '3c7379146541226235f9ebc0d61fdbcd';

const sunriseIcon = new Image(30, 30); 
sunriseIcon.src = 'sunrise.jpg'; 

const sunsetIcon = new Image(30, 30); 
sunsetIcon.src = 'sunset.jpg'; 

let weatherChart = null;
let windChart = null;

// Function to display weather for a given city
async function displayWeather(cityName) {
    try {
        // Fetch current weather data
        const weatherAPIUrl = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}&uvi`;

        const response = await fetch(weatherAPIUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch weather data');
        }

        const data = await response.json();

        const current_Date = new Date(data.dt * 1000);
        const dateString = current_Date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
        });

        currentDate.textContent = `(${dateString})`;
        currentCity.textContent = data.name;
        const temperatureK = data.main.temp;
        const temperatureC = (temperatureK - 273.15).toFixed(2);

        temperature.textContent = `${temperatureC}°C`;
        humidity.textContent = `${data.main.humidity}%`;
        windSpeed.textContent = `${data.wind.speed} m/s`;
        discription.textContent = `${data.weather[0].description}`;
        const weatherIcon = data.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`;

        const coordinates = await fetchCityCoordinates(cityName);
        const latitude = coordinates.lat;
        const longitude = coordinates.lon;

        const uvIndexValue = await fetchUVIndex(latitude, longitude);

        uvIndex.textContent = uvIndexValue;

        weatherIconElement.src = iconUrl;
        weatherIconElement.alt = 'Weather Icon';
    } catch (error) {
        console.error('Error:', error);
        errorMessage.style.display = "block";
        errorMessage.textContent = 'Failed to fetch weather data. Please try again later.';
    }
}

// Function to display 5-day forecast
async function displayForecast(cityName) {
    try {
        const forecastAPIUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${apiKey}`;
        const response = await fetch(forecastAPIUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch forecast data');
        }

        const data = await response.json();
        console.log("The data from the API: ", data);
        const forecasts = data.list || [];

        forecastDays.innerHTML = '';

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        let startIndex = forecasts.findIndex(forecast => new Date(forecast.dt * 1000) > currentDate);

        const labels = [];
        const temperatureData = [];
        const humidityData = [];
        const windSpeedData = [];
        const windDirectionData = [];
        const sunriseData = [];
        const sunsetData = [];

        for (let i = startIndex; i < startIndex + 8; i++) {
            const forecast = forecasts[i * 8];
            if (forecast) {
                const date = new Date(forecast.dt * 1000);
                const ddMmYyyyDate = date.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                });

                const temperatureK = forecast.main.temp;
                const humidityValue = forecast.main.humidity;
                const windSpeedValue = forecast.wind.speed;
                const windDirectionValue = forecast.wind.deg;
                const weatherIcon = forecast.weather[0].icon;
                const iconUrl = `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`;
                const temperatureC = (temperatureK - 273.15).toFixed(2);

                // Get sunrise and sunset time for the current day
                const sunriseTime = new Date((data.city.sunrise + i * 86400) * 1000);
                const sunsetTime = new Date((data.city.sunset + i * 86400) * 1000);

                labels.push(ddMmYyyyDate);
                temperatureData.push(temperatureK);
                humidityData.push(humidityValue);
                windSpeedData.push(windSpeedValue);
                windDirectionData.push(windDirectionValue);

                const forecastDayElement = document.createElement('div');
                forecastDayElement.className = 'forecast-day';
                forecastDayElement.innerHTML = `<div class="theday">
                    <p>${ddMmYyyyDate}</p>
                    <img src="${iconUrl}" alt="Weather Icon">
                    <div class="theday-info">    
                        <p><b>Temp</b>: ${temperatureC}°C</p>
                        <p><b>Humidity</b>: ${humidityValue}%</p>
                        <p style="display: flex; align-items: center; gap: 10px"><img src="sunrise.jpg" style="width: 30px; height: 30px;"> ${sunriseTime.toLocaleTimeString()}</p>
                        <p style="display: flex; align-items: center; gap: 10px"><img src="sunset.jpg" style="width: 30px; height: 30px;"> ${sunsetTime.toLocaleTimeString()}</p>
                    </div>
                </div>`;

                forecastDays.appendChild(forecastDayElement);
            }
        }

        // Add city sunrise and sunset times for the 8 days
        for (let i = 0; i < 8; i++) {
            const sunriseTime = new Date((data.city.sunrise + i * 86400) * 1000); // Add i days to sunrise time
            const sunsetTime = new Date((data.city.sunset + i * 86400) * 1000); // Add i days to sunset time
            sunriseData.push(sunriseTime);
            sunsetData.push(sunsetTime);
        }

        // Destroy existing charts before creating new ones
        if (weatherChart) {
            weatherChart.destroy();
        }
        if (windChart) {
            windChart.destroy();
        }

        // Temperature and Humidity Trends Over Time
        const ctx = document.getElementById('weatherChart').getContext('2d');
        weatherChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Temperature (°C)',
                        data: temperatureData,
                        borderColor: 'blue',
                        backgroundColor: 'blue',
                        pointRadius: 5
                    },
                    {
                        label: 'Humidity (%)',
                        data: humidityData,
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        pointRadius: 5
                    }
                ]
            },
            options: {
                scales: {
                    x: {},
                    y: { beginAtZero: true }
                }
            }
        });
        
        // Wind Speed and Direction Trends
        const ctx1 = document.getElementById('windChart').getContext('2d');
        windChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Wind Speed (m/s)',
                        data: windSpeedData,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Wind Direction (°)',
                        data: windDirectionData,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        type: 'line',
                        fill: false,
                        yAxisID: 'y2'
                    }
                ]
            },
            options: {
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Wind Speed (m/s)'
                        },
                        beginAtZero: true
                    },
                    y2: {
                        type: 'linear',
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Wind Direction (°)'
                        },
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false // Only want the grid lines for one axis to show up
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
        errorMessage.style.display = "block";
        errorMessage.textContent = 'Failed to fetch weather data. Please try again later.';
    }
}

async function fetchUVIndex(latitude, longitude) {
    const uvIndexAPIUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;
    try {
        const response = await fetch(uvIndexAPIUrl);
        if (response.ok) {
            const data = await response.json();
            const uvIndexValue = data.current.uvi;
            return uvIndexValue;
        } else {
            throw new Error('Failed to fetch UV index data');
        }
    } catch (error) {
        console.error('Error:', error);
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Failed to fetch UV index data. Please try again later.';
    }
}

async function fetchCityCoordinates(cityName) {
    const geocodingAPIUrl = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}`;
    try {
        const response = await fetch(geocodingAPIUrl);
        if (response.ok) {
            const data = await response.json();
            const coordinates = {
                lat: data.coord.lat,
                lon: data.coord.lon,
            };
            return coordinates;
        } else {
            throw new Error('Failed to fetch city coordinates');
        }
    } catch (error) {
        console.error('Error:', error);
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Failed to fetch city coordinates. Please try again later.';
    }
}

//Ask user permission to access location when the webpage is loaded...
function getUserLocationAndDisplayWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                console.log("Current location: ", latitude, longitude);   

                const reverseGeocodingAPIUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
                try {
                    const response = await fetch(reverseGeocodingAPIUrl);
                    console.log("Human readable address: ", response);
                    if (response.ok) {
                        const data = await response.json();
                        const city = data.address.city;
                        displayWeather(city);
                        displayForecast(city);
                        addToList(city);
                    } else {
                        throw new Error('Failed to fetch city data');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    errorMessage.style.display = "block";
                    errorMessage.textContent = error;
                }
            },
            (error) => {
                alert('Geolocation access is denied, set default location to Delhi');
                displayWeather('Delhi');
                displayForecast('Delhi');
                addToList('Delhi');
            }
        );
    } else {
        alert('Geolocation is not supported by the browser, set default location to Delhi');
        displayWeather('Delhi');
        displayForecast('Delhi');
        addToList('Delhi');
    }
}

function addToList(cityName) {
    const listEl = document.createElement('li');
    listEl.className = 'list';
    listEl.style.border = '#333 1px solid';
    listEl.style.borderRadius = "10px";
    listEl.style.margin = "20px";
    listEl.style.padding = "20px";
    listEl.textContent = cityName.toUpperCase();
    listEl.classList.add('list-group-item');
    listEl.dataset.value = cityName.toUpperCase();
    
    if (listGroup) {
        listGroup.after(listEl);
    }
}

// Function to check if a city name exists
async function checkCityExistence(cityName) {
    const geocodingAPIUrl = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}`;
    const response = await fetch(geocodingAPIUrl);

    if (response.ok) {
        return true; // City exists
    } else {
        return false; // City does not exist
    }
}

searchButton.addEventListener('click', async () => {
    const cityName = searchCity.value.trim();
    // Check if the city name is empty or contains only spaces
    if (cityName.trim() === '') {
        alert('Please enter a valid city name.');
        return;
    }
    // Check if the city exists
    const cityExists = await checkCityExistence(cityName);

    if (!cityExists) {
        alert('The entered city does not exist. Please enter a valid city name.');
        return;
    } else {
        addToList(cityName);
    }

    displayWeather(cityName);
    displayForecast(cityName);
});

function clearHistory(event) {
    event.preventDefault();
    const listElements = document.querySelectorAll('.list');
    listElements.forEach((listElement) => {
        listElement.innerHTML = ''; // Clear the content of each element with the 'list' class
        listElement.style.display = 'none';
    });
    localStorage.removeItem("cityname");
}

clearHistoryBtn.addEventListener('click', clearHistory);
// Initialize on page load
window.addEventListener('load', getUserLocationAndDisplayWeather);

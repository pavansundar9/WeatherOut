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

// API Key - REPLACE WITH YOUR VALID API KEY
const apiKey = '3c7379146541226235f9ebc0d61fdbcd'; // This key needs to be valid and active

const sunriseIcon = new Image(30, 30); 
sunriseIcon.src = 'sunrise.jpg'; 

const sunsetIcon = new Image(30, 30); 
sunsetIcon.src = 'sunset.jpg'; 

let weatherChart = null;
let windChart = null;

// Function to display weather for a given city
async function displayWeather(cityName) {
    try {
        // FIX 1: Removed invalid &uvi parameter from weather API URL
        const weatherAPIUrl = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}&units=metric`;

        const response = await fetch(weatherAPIUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch weather data: ${response.status}`);
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
        
        // FIX 2: Use metric units to avoid conversion, or keep conversion if using Kelvin
        const temperatureC = data.main.temp; // Will be in Celsius if units=metric
        // If you prefer Kelvin conversion: const temperatureC = (data.main.temp - 273.15).toFixed(2);

        temperature.textContent = `${temperatureC}°C`;
        humidity.textContent = `${data.main.humidity}%`;
        windSpeed.textContent = `${data.wind.speed} m/s`;
        discription.textContent = `${data.weather[0].description}`;
        
        const weatherIcon = data.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`;

        // FIX 3: Use coordinates directly from weather data instead of making another API call
        const latitude = data.coord.lat;
        const longitude = data.coord.lon;

        // FIX 4: Use alternative UV index method or display placeholder
        const uvIndexValue = await fetchUVIndex(latitude, longitude);
        uvIndex.textContent = uvIndexValue || 'N/A';

        weatherIconElement.src = iconUrl;
        weatherIconElement.alt = 'Weather Icon';
        
        // Clear any previous error messages
        errorMessage.style.display = "none";
        
    } catch (error) {
        console.error('Error:', error);
        errorMessage.style.display = "block";
        errorMessage.textContent = 'Failed to fetch weather data. Please try again later.';
    }
}

// Function to display 5-day forecast
async function displayForecast(cityName) {
    try {
        const forecastAPIUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${apiKey}&units=metric`;
        const response = await fetch(forecastAPIUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch forecast data: ${response.status}`);
        }

        const data = await response.json();
        console.log("The data from the API: ", data);
        const forecasts = data.list || [];

        forecastDays.innerHTML = '';

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        let startIndex = forecasts.findIndex(forecast => new Date(forecast.dt * 1000) > currentDate);
        if (startIndex === -1) startIndex = 0; // Fallback if no future forecasts found

        const labels = [];
        const temperatureData = [];
        const humidityData = [];
        const windSpeedData = [];
        const windDirectionData = [];

        // FIX 5: Fixed the forecast loop logic
        for (let i = 0; i < 5; i++) { // Get 5 days
            const forecastIndex = startIndex + (i * 8); // Every 8th item represents next day (3-hour intervals)
            const forecast = forecasts[forecastIndex];
            
            if (forecast) {
                const date = new Date(forecast.dt * 1000);
                const ddMmYyyyDate = date.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                });

                const temperatureC = forecast.main.temp; // Already in Celsius with units=metric
                const humidityValue = forecast.main.humidity;
                const windSpeedValue = forecast.wind.speed;
                const windDirectionValue = forecast.wind.deg || 0;
                const weatherIcon = forecast.weather[0].icon;
                const iconUrl = `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`;

                // FIX 6: Use more realistic sunrise/sunset calculation or remove if not available
                const sunriseTime = new Date((data.city.sunrise + i * 86400) * 1000);
                const sunsetTime = new Date((data.city.sunset + i * 86400) * 1000);

                labels.push(ddMmYyyyDate);
                temperatureData.push(temperatureC);
                humidityData.push(humidityValue);
                windSpeedData.push(windSpeedValue);
                windDirectionData.push(windDirectionValue);

                const forecastDayElement = document.createElement('div');
                forecastDayElement.className = 'forecast-day';
                forecastDayElement.innerHTML = `<div class="theday">
                    <p>${ddMmYyyyDate}</p>
                    <img src="${iconUrl}" alt="Weather Icon">
                    <div class="theday-info">    
                        <p><b>Temp</b>: ${temperatureC.toFixed(1)}°C</p>
                        <p><b>Humidity</b>: ${humidityValue}%</p>
                        <p style="display: flex; align-items: center; gap: 10px"><img src="sunrise.jpg" style="width: 30px; height: 30px;"> ${sunriseTime.toLocaleTimeString()}</p>
                        <p style="display: flex; align-items: center; gap: 10px"><img src="sunset.jpg" style="width: 30px; height: 30px;"> ${sunsetTime.toLocaleTimeString()}</p>
                    </div>
                </div>`;

                forecastDays.appendChild(forecastDayElement);
            }
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
                        backgroundColor: 'rgba(0, 0, 255, 0.1)',
                        pointRadius: 5,
                        fill: false
                    },
                    {
                        label: 'Humidity (%)',
                        data: humidityData,
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        pointRadius: 5,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: { 
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    }
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
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
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
                        min: 0,
                        max: 360,
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
        
        // Clear any previous error messages
        errorMessage.style.display = "none";
        
    } catch (error) {
        console.error('Error:', error);
        errorMessage.style.display = "block";
        errorMessage.textContent = 'Failed to fetch forecast data. Please try again later.';
    }
}

// FIX 7: Alternative UV Index function using free UV API or fallback
async function fetchUVIndex(latitude, longitude) {
    try {
        // Option 1: Try the UV endpoint (may require paid subscription)
        const uvIndexAPIUrl = `https://api.openweathermap.org/data/2.5/uvi?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;
        const response = await fetch(uvIndexAPIUrl);
        
        if (response.ok) {
            const data = await response.json();
            return data.value ? data.value.toFixed(1) : 'N/A';
        } else {
            // Option 2: If UV API fails, try alternative or return placeholder
            console.warn('UV Index API not available, using fallback');
            return 'N/A';
        }
    } catch (error) {
        console.error('UV Index Error:', error);
        return 'N/A';
    }
}

// FIX 8: Removed redundant fetchCityCoordinates function since coordinates are available in weather data

// Ask user permission to access location when the webpage is loaded
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
                        // FIX 9: Better city name extraction with fallbacks
                        const city = data.address.city || 
                                   data.address.town || 
                                   data.address.village || 
                                   data.address.county || 
                                   'Delhi'; // Ultimate fallback
                        
                        displayWeather(city);
                        displayForecast(city);
                        addToList(city);
                    } else {
                        throw new Error('Failed to fetch city data');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    // Fallback to Delhi if reverse geocoding fails
                    displayWeather('Delhi');
                    displayForecast('Delhi');
                    addToList('Delhi');
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
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
    // FIX 10: Check if city already exists in the list
    const existingItems = document.querySelectorAll('.list[data-value="' + cityName.toUpperCase() + '"]');
    if (existingItems.length > 0) {
        return; // Don't add duplicate cities
    }

    const listEl = document.createElement('li');
    listEl.className = 'list';
    listEl.style.border = '#333 1px solid';
    listEl.style.borderRadius = "10px";
    listEl.style.margin = "20px";
    listEl.style.padding = "20px";
    listEl.style.cursor = "pointer"; // Add cursor pointer
    listEl.textContent = cityName.toUpperCase();
    listEl.classList.add('list-group-item');
    listEl.dataset.value = cityName.toUpperCase();
    
    // FIX 11: Add click event to list items
    listEl.addEventListener('click', () => {
        displayWeather(cityName);
        displayForecast(cityName);
    });
    
    if (listGroup) {
        listGroup.after(listEl);
    }
}

// Function to check if a city name exists
async function checkCityExistence(cityName) {
    try {
        const geocodingAPIUrl = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}`;
        const response = await fetch(geocodingAPIUrl);
        return response.ok;
    } catch (error) {
        console.error('Error checking city existence:', error);
        return false;
    }
}

searchButton.addEventListener('click', async () => {
    const cityName = searchCity.value.trim();
    
    if (cityName === '') {
        alert('Please enter a valid city name.');
        return;
    }
    
    // Show loading state
    searchButton.textContent = 'Searching...';
    searchButton.disabled = true;
    
    try {
        const cityExists = await checkCityExistence(cityName);

        if (!cityExists) {
            alert('The entered city does not exist. Please enter a valid city name.');
            return;
        }

        displayWeather(cityName);
        displayForecast(cityName);
        addToList(cityName);
        
        // Clear search input
        searchCity.value = '';
        
    } finally {
        // Reset button state
        searchButton.textContent = 'Search';
        searchButton.disabled = false;
    }
});

// FIX 12: Allow search on Enter key press
searchCity.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchButton.click();
    }
});

function clearHistory(event) {
    event.preventDefault();
    const listElements = document.querySelectorAll('.list');
    listElements.forEach((listElement) => {
        listElement.remove(); // Use remove() instead of clearing innerHTML
    });
    localStorage.removeItem("cityname");
}

clearHistoryBtn.addEventListener('click', clearHistory);

// Initialize on page load
window.addEventListener('load', getUserLocationAndDisplayWeather);
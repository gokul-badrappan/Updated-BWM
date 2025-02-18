# Best-Worst Method (BWM) Priority Calculator

A web-based calculator implementing the New Best-Worst Method for multi-criteria decision making. This application helps users calculate priority weights for different factors.

## Features

- Interactive web interface for BWM calculations
- Dynamic factor input handling
- Real-time validation of inputs
- Visualization of results including:
  - Priority weights for each factor
  - BWM modified matrix
  - Objective value (ξ)
- Responsive design that works on both desktop and mobile devices
- Clear explanation of importance scores

## Technology Stack

- **Frontend:**
  - HTML5
  - Tailwind CSS
  - JavaScript

- **Backend:**
  - Python 3.13 and higher
  - Flask
  - NumPy
  - Pandas
  - GEKKO (for optimization)

## Prerequisites

- Python 3.13
- pip (Python package manager)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bwm-calculator
```

2. Create and activate a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
```

3. Install the required packages:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the root directory and add your secret key:
```
SECRET_KEY=your_secret_key_here
FLASK_ENV=development
```

## Running the Application

1. For development:
```bash
python app.py
```

2. For production, using Gunicorn:
```bash
gunicorn app:app
```

The application will be available at `http://localhost:5000` (or your configured port).

## Usage

1. Enter the number of factors you want to compare (minimum 2)
2. Select the best and worst factors
3. Provide importance scores for:
   - Best factor compared to other factors
   - Other factors compared to worst factor
4. Click "Calculate Priority Weights" to see the results
5. Use the checkbox to show/hide the detailed BWM matrix


## Project Structure

```
bwm-calculator/
├── app.py              # Flask application
├── static/
│   ├── js/
│   │   └── main.js    # Frontend JavaScript
│   └── styles/
│       └── styles.css # Custom styles
├── templates/
│   └── index.html     # Main HTML template
├── requirements.txt    # Python dependencies
└── .env               # Environment variables
```

## Error Handling

The application includes comprehensive error handling for:
- Invalid input validation
- Server-side calculation errors
- Client-side validation
- Network errors

## License

This project is maintained by the Department of Management Studies (DoMS), IISc. All rights reserved.

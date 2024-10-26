module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {
      animation: {
        'bounce-medium': 'bounce-medium 1s infinite',
        'bounce-large': 'bounce-large 1.5s infinite',
        'mega': 'mega 2s ease-in-out',
        'fade-in': 'fade-in 0.5s ease-out'
      },
      keyframes: {
        'bounce-medium': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-25px)' }
        },
        'bounce-large': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-30px) scale(1.1)' }
        },
        'mega': {
          '0%': { transform: 'translateY(0) scale(1) rotate(0deg)' },
          '25%': { transform: 'translateY(-40px) scale(1.2) rotate(-5deg)' },
          '50%': { transform: 'translateY(-20px) scale(1.2) rotate(5deg)' },
          '75%': { transform: 'translateY(-40px) scale(1.2) rotate(-5deg)' },
          '100%': { transform: 'translateY(0) scale(1) rotate(0deg)' }
        },
        'fade-in': {
          'from': { opacity: '0', transform: 'translateY(-10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
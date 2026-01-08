/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class', 'class'],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
    	extend: {
    		fontFamily: {
    			sans: [
    				'Inter',
    				'system-ui',
    				'sans-serif'
    			],
    			body: [
    				'Inter',
    				'system-ui',
    				'sans-serif'
    			],
    			heading: [
    				'Space Grotesk',
    				'system-ui',
    				'sans-serif'
    			]
    		},
    		colors: {
    			'sandy-clay': {
    				'50': '#faf2ea',
    				'100': '#f5e6d6',
    				'200': '#ecccac',
    				'300': '#e2b383',
    				'400': '#d8995a',
    				'500': '#cf8030',
    				'600': '#a56627',
    				'700': '#7c4d1d',
    				'800': '#533313',
    				'900': '#291a0a',
    				'950': '#1d1207'
    			},
    			'desert-sand': {
    				'50': '#faf2eb',
    				'100': '#f4e4d7',
    				'200': '#eac9ae',
    				'300': '#dfae86',
    				'400': '#d4935e',
    				'500': '#c97836',
    				'600': '#a1602b',
    				'700': '#794820',
    				'800': '#513015',
    				'900': '#28180b',
    				'950': '#1c1107'
    			},
    			'pale-oak': {
    				'50': '#f5f3ef',
    				'100': '#ebe7e0',
    				'200': '#d7cfc1',
    				'300': '#c3b7a2',
    				'400': '#af9f83',
    				'500': '#9c8763',
    				'600': '#7c6c50',
    				'700': '#5d513c',
    				'800': '#3e3628',
    				'900': '#1f1b14',
    				'950': '#16130e'
    			},
    			'muted-teal': {
    				'50': '#f0f4f3',
    				'100': '#e2e9e6',
    				'200': '#c5d3cd',
    				'300': '#a8bdb4',
    				'400': '#8ba79b',
    				'500': '#6e9182',
    				'600': '#587468',
    				'700': '#42574e',
    				'800': '#2c3a34',
    				'900': '#161d1a',
    				'950': '#0f1412'
    			},
    			'midnight-violet': {
    				'50': '#f6eef4',
    				'100': '#eddee8',
    				'200': '#dbbdd2',
    				'300': '#c99cbb',
    				'400': '#b87aa4',
    				'500': '#a6598e',
    				'600': '#854771',
    				'700': '#633655',
    				'800': '#422439',
    				'900': '#21121c',
    				'950': '#170c14'
    			},
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			chart: {
    				'1': 'hsl(var(--chart-1))',
    				'2': 'hsl(var(--chart-2))',
    				'3': 'hsl(var(--chart-3))',
    				'4': 'hsl(var(--chart-4))',
    				'5': 'hsl(var(--chart-5))'
    			}
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		keyframes: {
    			'accordion-down': {
    				from: {
    					height: '0'
    				},
    				to: {
    					height: 'var(--radix-accordion-content-height)'
    				}
    			},
    			'accordion-up': {
    				from: {
    					height: 'var(--radix-accordion-content-height)'
    				},
    				to: {
    					height: '0'
    				}
    			}
    		},
    		animation: {
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up': 'accordion-up 0.2s ease-out'
    		}
    	}
    },
    plugins: [require("tailwindcss-animate")],
}

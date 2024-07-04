from flask import Flask, redirect, url_for, render_template, request, session, flash
import random
import json

#configurations
preferisciGenerated = []
with open('config/preferisci.json','r') as config:
	preferisciCollection = json.load(config)

#app definition
app = Flask(__name__)

#functions
def generatePreferisci():
	while True:
		global preferisciGenerated
		if len(preferisciGenerated)==len(preferisciCollection):
			preferisciGenerated = []
		preferisci = random.randint(0,len(preferisciCollection))
		if preferisci not in preferisciGenerated:
			break
	return preferisci

def getAlternatives(preferisci):
	i=0
	selectedPreferisci = preferisciCollection[i]
	for item in preferisciCollection:
		if preferisciCollection[i]['id']==preferisci:
			selectedPreferisci = preferisciCollection[i]
			break
		i+=1
	return selectedPreferisci


#routing
@app.route('/')
def main():
	return render_template('start.html',firstAlternative='',secondAlternative='')

@app.route('/prrreferisci')
def game():
	newPreferisci = generatePreferisci()
	alternatives = getAlternatives(newPreferisci)
	firstAlternative = alternatives['firstAlternative'].encode('latin-1').decode('utf-8')
	secondAlternative = alternatives['secondAlternative'].encode('latin-1').decode('utf-8')
	preferisciGenerated.append(newPreferisci)
	return render_template('home.html',firstAlternative=firstAlternative,secondAlternative=secondAlternative)

#main
if __name__ == '__main__':
	app.run(host='localhost', port=80, debug=True)

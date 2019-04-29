const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');

const postgres = knex({
  client: 'pg',
  connection: {
    host : 'smartbrain.ciloizq633sj.ap-southeast-1.rds.amazonaws.com',
    user : 'softdev',
    password : 'Unix11123',
    database : 'postgres'
  }
});

postgres.select('*').from('login').then(data => {
	console.log(data);
});

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
	console.log('Hitting Root Route');
	res.json('Success');
});

app.post('/signin', (req, res) => {
	// bcrypt.compare("bacon", hash, (err, res) => {
	//     res == true
	// });
	const { email, password } = req.body;
	postgres
		.select('*')
		.from('login')
		.where('email', '=', email)
		.then(data => {
			console.log(data);
			const isValid = bcrypt.compareSync(password,data[0].hash);
			if (isValid) {
				res.json('SUCCESS');		
			} else {
				res.status(404).json('Error Logging In');
			}
		})	
});

app.post('/register', (req, res) => {
	const { email, name, password} = req.body;

	const hash = bcrypt.hashSync(password);
	postgres.transaction(trx => {
		trx.insert({
			hash,
			email
		})
		.into('login')
		.returning('email')
		.then(loginEmail => {
			return trx('users')
			.returning('*')
			.insert({
				name,
				email: loginEmail[0],
				joined: new Date()
			}).then(user => {
				res.json(user[0]);
			}).catch(err => {
				res.status(400).json('Something Went Wrong')
			})
		})
		.then(trx.commit)
		.catch(trx.rollBack)
	})
	.catch(err => {
		res.status(404).json('Unable to register');
	})
});

app.get('/profile/:id', (req, res) => {
	const { id } = req.params;
	postgres
		.select('*')
		.from('users')
		.where({
			id,
		})
		.then(user => {
			user.length > 0 
			? res.json(user[0])
			: res.status(400).send('User not found');;
		})
		.catch(err => {
			res.status(400).send('Error in getting user ');
		})
})

app.put('/image', (req, res) => {
	const { id } = req.body;
	postgres('users')
		.where('id', '=', id)
		.increment('entries', 1)
		.returning('entries')
		.then(entries => {
			entries.length > 0
			? res.json(entries[0])
			: res.status(400).json('User Does Not Exist');
		})
		.catch(err => {
			res.status(400).json('Error Finding the user');
		})
});



// // Load hash from your password DB.
// bcrypt.compare("bacon", hash, function(err, res) {
//     // res == true
// });
// bcrypt.compare("veggies", hash, function(err, res) {
//     // res = false
// });

app.listen(process.env.PORT, () => {
	console.log(`app is running on ${process.env.PORT}`);
});




/*
/ ----> res = this.working
/signIn ----> POST ---> success/fail
/register ----> POST ---> new user Object
/profile/:userId ---> GET ---> user
/image ----> PUT ---> updated user 


*/
const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const config = {
  logging: false,
};

const bcrypt = require('bcrypt');

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || 'postgres://localhost/acme_db',
  config
);

const User = conn.define('user', {
  username: STRING,
  password: STRING,
});

User.addHook('beforeSave', async (user) => {
  if (user._changed.has('password')) {
    const password = await bcrypt.hash(user.password, 5);
    user.password = password;
  }

  // await user.save();
});

User.byToken = async (token) => {
  try {
    const user = await User.findOne({
      where: { id: token },
      attribute: ['id', 'username'],
    });
    if (user) {
      return user;
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
      // password,
    },
  });

  if (user && (await bcrypt.compare(password, user.password))) {
    return user.id;
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw' },
    { username: 'moe', password: 'moe_pw' },
    { username: 'larry', password: 'larry_pw' },
  ];
  const notes = [{ text: 'note1' }, { text: 'note2' }, { text: 'note3' }];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  const [note1, note2, note3] = await Promise.all(
    notes.map((note) => Note.create(note))
  );
  note1.userId = 1;
  note2.userId = 1;
  note3.userId = 2;

  await Promise.all([note1.save(), note2.save(), note3.save()]);

  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

const Note = conn.define('note', {
  text: {
    type: STRING,
  },
});

Note.belongsTo(User);
User.hasMany(Note);

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};

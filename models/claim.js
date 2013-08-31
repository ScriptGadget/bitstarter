/* Object/Relational mapping for instances of the Claim class.
     - classes correspond to tables
     - instances correspond to rows
    - fields correspond to columns
In other words, this code defines how a row in the postgres order table
maps to the JS Order object.
*/
module.exports = function(sequelize, DataTypes) {
  return sequelize.define("Claim", {
    email: {type: DataTypes.STRING, unique: true, allowNull: false},
    latitude: {type: DataTypes.FLOAT},
    longitude: {type: DataTypes.FLOAT},
    size: {type: DataTypes.INTEGER},
    name: {type: DataTypes.STRING},
    description: {type: DataTypes.STRING},
  });
};

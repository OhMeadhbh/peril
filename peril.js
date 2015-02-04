( function () {

              require( 'sn-core' );
  var fs    = require( 'fs' );
  var spawn = require( 'child_process' ).spawn;

  _$construct( 'exports', { _root: [], ignore: [] }, module );

  module.exports.prototype._$init = function () {
    if( this.root ) {
      if( '/' === this.root.substr( -1, 1 ) ) {
        this.root = this.root.slice( 0, -1 );
      }
      this._root = this.root.split( '/' );
    }
  };

  module.exports.prototype._$initAsync = function ( callback ) {
    callback = _$g( callback );
    try {
      fs.readFile( this._root.concat( [ 'etc', 'peril', 'peril.json' ] ).join( '/' ), function( err, data ) {
        if( err && ( 'ENOENT' !== err.code ) ) { return callback( err ); }
        if( ! err ) { this._$merge( JSON.parse( data.toString() ) ); }
        callback( null, this );
      }.bind( this ) );
    } catch( e ) {
      callback( e );
    }
  };

  module.exports.prototype.profile_list = function ( callback ) {
    callback = _$g( callback );
    var profiles = [];
    fs.readdir( this._root.concat( [ 'etc', 'peril' ] ).join( '/' ), function( err, data ) {
      if( err ) { return callback( err ); }
      __process_dirs.call( this, data );
    }.bind( this ) );

    function __process_dirs( list ) {
      if( 0 == list.length ) {
        return callback( null, profiles );
      }
      var current = list.shift();
      fs.lstat( this._root.concat( [ 'etc', 'peril', current ] ).join( '/' ), function( err, stats ) {
        if( ( ! err ) && stats.isDirectory() &&
            ( ! this.ignore._$any( function( e ) { return current === e; } ) ) ) {
          profiles.push( current );
        }
        (__process_dirs.bind(this))._$nextTick( list );
      }.bind( this ) );
    }
  };

  module.exports.prototype.profile_create = function ( name, callback ) {
    callback = _$g( callback );
    var path = this._root.concat( [ 'etc', 'peril', name ] ).join( '/' );
    fs.lstat( path, function( err, stats ) {
      if( err && err.code !== 'ENOENT' ) { return callback( err ); }
      if( ! err ) {
        return callback();
      }
      fs.mkdir( path, function( err ) {
        if( err ) { return callback( err ); }
        return callback();
      } );
    } );
  };

  module.exports.prototype.profile_destroy = function ( name, callback ) {
    callback = _$g( callback );
    if( ! name ) { return callback(); }
    var path = this._root.concat( [ 'etc', 'peril', name ] ).join( '/' );
    fs.lstat( path, function( err, stats ) {
      if( err && err.code !== 'ENOENT' ) { return callback( err ); }
      if( err ) {
        return callback();
      }

      var rm = spawn( 'rm', [ '-rf', path ] );
      rm.on( 'close', function( code ) {
        var err;
        if( 0 !== code ) {
          err = new Error( 'rm command returned with non-zero return code: ' + code );
        }
        callback( err );
      } );
    } );
  };

  module.exports.prototype.profile_ref = function ( name, callback ) {
    callback = _$g( callback );
    if( ! name ) { return callback(); }
    var path = this._root.concat( [ 'etc', 'peril', name ] ).join( '/' ); 
    fs.lstat( path, function( err, stats ) {
      if( err ) { return callback(); }
      if( stats.isDirectory() &&
          ( ! this.ignore._$any( function( e ) { return name === e; } ) ) ) {
        return callback( null, path );
      } 
      return callback();
    }.bind( this ) );
  };

  module.exports.prototype.pointer_list = function ( callback ) {
    callback = _$g( callback );
    var profiles = [];
    fs.readdir( this._root.concat( [ 'etc', 'peril' ] ).join( '/' ), function( err, data ) {
      if( err ) { return callback( err ); }
      __process_dirs.call( this, data );
    }.bind( this ) );

    function __process_dirs( list ) {
      if( 0 == list.length ) {
        return callback( null, profiles.join( '\n' ) );
      }
      var current = list.shift();
      fs.lstat( this._root.concat( [ 'etc', 'peril', current ] ).join( '/' ), function( err, stats ) {
        if( ( ! err ) && stats.isSymbolicLink() &&
            ( ! this.ignore._$any( function( e ) { return current === e; } ) ) ) {
          profiles.push( current );
        }
        (__process_dirs.bind(this))._$nextTick( list );
      }.bind( this ) );
    }
  };

  module.exports.prototype.pointer_link = function ( pointer, profile, callback) {
    callback = _$g( callback );
    if( ( ! pointer ) || ( ! profile ) ) {
      return callback();
    }

    var path = this._root.concat( [ 'etc', 'peril', pointer ] ).join( '/' ); 
    // if the link already exists, delete it.
    fs.lstat( path, function( err, stats ) {
      if( err && ( 'ENOENT' !== err.code ) ) { return callback( err ); }
      if( ! err ) {
        if( stats.isSymbolicLink() ) {
          return __remove_old_link();
        } else {
          return callback( new Error( pointer + " is not a pointer" ) );
        }
      } else {
        return __make_new_link();
      }
    } );

    function __remove_old_link() {
      fs.unlink( path, function( err ) {
        if( err ) { return callback( err ); }
        return __make_new_link();
      } );
    }

    function __make_new_link() {
      fs.symlink( [ '.', profile ].join( '/' ), path, function( err ) {
        if( err ) { return callback( err ); }
        return callback();
      } );
    }
              
  };

  module.exports.prototype.pointer_unlink = function ( pointer, callback ) {
    callback = _$g( callback );
    if( ! pointer ) {
      return callback();
    }

    var path = this._root.concat( [ 'etc', 'peril', pointer ] ).join( '/' ); 

    fs.lstat( path, function( err, stats ) {
      if( err ) { return callback( err ); }

      if( stats.isSymbolicLink() ) {
        fs.unlink( path, function( err ) {
          if( err ) { return callback( err ); }
          return callback();
        } );
      } else {
        return callback( new Error( pointer + " is not a pointer" ) );
      }
    } );
  };

  module.exports.prototype.pointer_ref = function ( name, callback ) {
    callback = _$g( callback );
    if( ! name ) { return callback(); }
    var path = this._root.concat( [ 'etc', 'peril', name ] ).join( '/' ); 
    fs.lstat( path, function( err, stats ) {
      if( err ) { return callback(); }
      if( stats.isSymbolicLink() &&
          ( ! this.ignore._$any( function( e ) { return name === e; } ) ) ) {
        return callback( null, path );
      } 
      return callback();
    }.bind( this ) );
  };

  module.exports.prototype.file_add = function ( path, callback ) { 
    callback = _$g( callback );
    var confpath = this._root.concat( [ 'etc', 'peril' ] ).join( '/' ); 
    var sourcepath = (path.substr(0,1)=='/')?path:[process.cwd(),path].join('/');
    var statdata;

    fs.lstat( path, function( err, data ) {
      if( err ) { return callback( err ); }
      statdata = data;
      __get_profile_paths.call( this, function( err, paths ) {
        if( err ) { return callback( err ); }
        return __copy_to_path.call( this, paths );
      }.bind(this) );
    }.bind(this) );

    function _build_final_link() {
      var rmrf = spawn( 'rm', [ (statdata.isDirectory()?'-rf':'-f'), sourcepath ] );
      rmrf.on( 'close', function( code ) {
        if( 0 !== code ) {
          return callback( new Error( 'rm command returned non-zero code: ' + code ) );
        }

        fs.symlink( confpath + '/' + 'current' + sourcepath, sourcepath, function( err ) {
          if( err ) { return callback( err ); }
          return callback();
        } );
      } );
    }

    function __copy_to_path( paths ) {
      if( ( ! paths ) || ( 0 == paths.length ) ) { return _build_final_link(); }
      var current = paths.shift();
      var currentpath = [ confpath, current ].join( '/' ) + sourcepath;
      var currentdir = currentpath.split( '/' ).slice(0,-1).join('/');
      fs.stat( currentdir, function( err, data ) {
        if( err && ( 'ENOENT' !== err.code ) ) { return callback( err ); }
        if( data && ( ! data.isDirectory() ) ) { return callback( new Error( 'eep' ) ); }
        if( err ) {
          var mkdir = spawn( 'mkdir', [ '-p', currentdir ] );
          mkdir.on( 'close', function( code ) {
            if( 0 !== code ) {
              return callback( new Error( 'mkdir command returned non-zero code: ' + code ) );
            }
            return __really_copy_it_this_time();
          } );
        }
        __really_copy_it_this_time();
      } );

      function __really_copy_it_this_time() {
        var cp;
        if( statdata.isDirectory() ) {
          cp = spawn( 'cp', [ '-r', sourcepath, currentpath ] );
        } else {
          cp = spawn( 'cp', [ '-P', sourcepath, currentpath ] );
        }
        cp.on( 'close', function( code ) {
          if( 0 !== code ) {
            return callback( new Error( 'cp command returned non-zero return code: ' + code ) );
          } else {
            return __copy_to_path._$nextTick( paths );
          }
        } );
      }
    }

    function __get_profile_paths( complete ) {
      var paths = [];
      fs.readdir( confpath, function( err, data ) {
        if( err ) { return complete( err ); }
        return __test_next_path( data );
      } );

      function __test_next_path( data ) {
        if( ( ! data ) || ( 0 == data.length ) ) { return complete( null, paths ); }
        var current = data.shift();
        fs.lstat( [ confpath, current ].join( '/' ), function( err, stats ) {
          if( err ) { return complete( err ); }
          if( stats.isDirectory() ) { paths.push( current ); }
          __test_next_path._$nextTick( data );
        } );
      }
    }
  };

  module.exports.prototype.file_remove = function ( path, callback ) {
    return 'file remove' + this.root;
  };

  module.exports.prototype.file_ref = function ( path, callback ) {
    return 'file ref' + this.root;
  };

} ) ();
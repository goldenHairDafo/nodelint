#! /usr/bin/env node

/*
 * This is a command line runner of jslint for Node.js
 *
 * Changes released into the Public Domain by tav <tav@espians.com>
 * Support for config/multiple files added by Corey Hart <corey@codenothing.com>
 *
 * Adapted from rhino.js, Copyright (c) 2002 Douglas Crockford
 * Adapted from posixpath.py in the Python Standard Library.
 *
 */

/*global JSLINT, options */
/*jslint evil: true, regexp: false */

var fs = require('fs'),
    sys = require('sys'),
    SCRIPT_DIRECTORY,
    DEFAULT_CONFIG_FILE,
    params,
    files,
    config_file,
    config_param_found;

// -----------------------------------------------------------------------------
// file manipulation utility funktions
// -----------------------------------------------------------------------------

function join_posix_path(p1, p2) {
    var path = p1;
    if (p2.charAt(0) === "/") {
        path = p2;
    } else if (path === "" || path.charAt(path.length - 1) === "/") {
        path += p2;
    } else {
        path += "/" + p2;
    }
    return path;
}

function split_posix_path(path) {
    var i = path.lastIndexOf('/') + 1,
        head = path.slice(0, i),
        tail = path.slice(i);
    if (head && head !== ('/' * head.length)) {
        head = head.replace(/\/*$/g, "");
    }
    return [head, tail];
}

function dirname(path) {
    return split_posix_path(path)[0];
}

// -----------------------------------------------------------------------------
// load jslint itself and set the path to the default config file
// -----------------------------------------------------------------------------

SCRIPT_DIRECTORY = dirname(fs.realpathSync(__filename));
DEFAULT_CONFIG_FILE = join_posix_path(SCRIPT_DIRECTORY, 'config.js');

eval(fs.readFileSync(join_posix_path(SCRIPT_DIRECTORY, 'jslint/jslint.js')));

// -----------------------------------------------------------------------------
// skript main funktion
// -----------------------------------------------------------------------------

function lint(files, default_config_file, config_file) {

    var error_regexp = /^\s*(\S*(\s+\S+)*)\s*$/,
        retval = 0,
        error_prefix,
        error_suffix,
        option_name,
        real_options;

    if (!files.length) {
	    sys.puts(
            "Usage: nodelint.js file.js [file2 file3 ...] [options]\n" +
            "Options:\n\n" +
            "  --config FILE       the path to a config.js file with JSLINT options"
        );
        return 1;
    }

    eval(fs.readFileSync(default_config_file));

    if (typeof options === 'undefined') {
	    sys.puts("Error: there's no `options` variable in the default config file.");
        return 1;
    }
    
    real_options = options;
    
    if (typeof config_file !== 'undefined') {
        eval(fs.readFileSync(config_file));

        if (typeof options === 'undefined') {
	        sys.puts("Error: there's no `options` variable in the config file.");
            return 1;
        }
        
        for (option_name in options) {
            if (typeof option_name === 'string') {
                real_options[option_name] = options[option_name];
            }
        }
    }

    error_prefix = real_options.error_prefix;
    error_suffix = real_options.error_suffix;

    files.forEach(function (file) {

        var source,
            i,
            error;

        try {
            source = fs.readFileSync(file);
        } catch (err) {
            sys.puts("Error: Opening file <" + file + ">");
            sys.puts(err + '\n');
            retval = 1;
            return;
        }

        // remove any shebangs
        source = source.replace(/^\#\!.*/, '');

        if (!JSLINT(source, real_options)) {
            for (i = 0; i < JSLINT.errors.length; i += 1) {
                error = JSLINT.errors[i];
                if (error) {
                    sys.error(
                        error_prefix + file + ', line ' + error.line +
                        ', character ' + error.character + error_suffix +
                        error.reason + '\n' +
                        (error.evidence || '').replace(error_regexp, "$1") +
                        "\n"
                    );
                }
            }
            retval = 2;
            return;
        }

    });

    return retval;

}

// -----------------------------------------------------------------------------
// run the file as a script if called directly, i.e. not imported via require()
// -----------------------------------------------------------------------------

if (module.id === '.') {

    params = process.ARGV.splice(2);
    files = [];

    // a very basic pseudo --options parser
    params.forEach(function (param) {
        if (param.slice(0, 9) === "--config=") {
            config_file = param.slice(9);
        } else if (param === '--config') {
            config_param_found = true;
        } else if (config_param_found) {
            config_file = param;
            config_param_found = false;
        } else if ((param === '--help') || (param === '-h')) {
        } else {
            files.push(param);
        }
    });

    process.exit(lint(files, DEFAULT_CONFIG_FILE, config_file));

}

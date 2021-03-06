import emojiRegex from 'emoji-regex';

// https://github.com/joyent/node/blob/192192a09e2d2e0d6bdd0934f602d2dbbf10ed06/tools/doc/html.js#L172-L183
export const getNodejsId = (text: string, repetition?: number): string => {
  text = text.replace(/[^a-z0-9]+/g, '_');
  text = text.replace(/^_+|_+$/, '');
  text = text.replace(/^([^a-z])/, '_$1');

  // If no repetition, or if the repetition is 0 then ignore. Otherwise append '_' and the number.
  // An example may be found here: http://nodejs.org/api/domain.html#domain_example_1
  if (repetition) {
    text += '_' + repetition;
  }

  return text;
};

export const getBasicGithubId = (text: string): string => {
  return text
    // numeric character references
    .replace(/&#(\d+);/ig, (match, $1) => String.fromCharCode($1).toLowerCase())
    // to hyphen
    .replace(/ /g, '-')
    // escape codes
    .replace(/%([abcdef]|\d){2}/ig, '')
    // single chars that are removed
    .replace(/[/?!:[\]`.,()*"';{}+=<>~$|#@%^&¥–—]/g, '')
    // CJK punctuations that are removed
    .replace(/[。？！，、；：“”【】（）〔〕［］﹃﹄ ‘’﹁﹂—…－～《》〈〉「」]/g, '');
};

export const getGithubId = (text: string, repetition?: number): string => {
  text = getBasicGithubId(text);

  // If no repetition, or if the repetition is 0 then ignore. Otherwise append '-' and the number.
  if (repetition) {
    text += '-' + repetition;
  }

  // Strip emojis
  text = text.replace(emojiRegex(), '');

  return text;
};

export const getBitbucketId = (text: string, repetition?: number): string => {
  text = 'markdown-header-' + getBasicGithubId(text);

  // BitBucket condenses consecutive hyphens (GitHub doesn't)
  text = text.replace(/--+/g, '-');

  // If no repetition, or if the repetition is 0 then ignore. Otherwise append '_' and the number.
  // https://groups.google.com/d/msg/bitbucket-users/XnEWbbzs5wU/Fat0UdIecZkJ
  if (repetition) {
    text += '_' + repetition;
  }

  return text;
};

export const getBasicGhostId = (text: string): string => {
  return text.replace(/ /g, '')
    // escape codes are not removed
    // single chars that are removed
    .replace(/[/?:[\]`.,()*"';{}\-+=<>!@#%^&\\|]/g, '')
    // $ replaced with d
    .replace(/\$/g, 'd')
    // ~ replaced with t
    .replace(/~/g, 't');
};

export const getGhostId = (text: string): string => {
  text = getBasicGhostId(text);

  // Repetitions not supported

  return text;
};

// see: https://github.com/gitlabhq/gitlabhq/blob/master/doc/user/markdown.md#header-ids-and-links
export const getGitlabId = (text: string, repetition?: number): string => {
  text = text
    .replace(/<(.*)>(.*)<\/\1>/g, '$2') // html tags
    .replace(/!\[.*]\(.*\)/g, '')      // image tags
    .replace(/\[(.*)]\(.*\)/, '$1')    // url
    .replace(/\s+/g, '-')              // All spaces are converted to hyphens
    .replace(/[/?!:[\]`.,()*"';{}+=<>~$|#@]/g, '') // All non-word text (e.g., punctuation, HTML) is removed
    .replace(/[。？！，、；：“”【】（）〔〕［］﹃﹄ ‘’﹁﹂—…－～《》〈〉「」]/g, '') // remove CJK punctuations
    .replace(/[-]+/g, '-')              // duplicated hyphen
    .replace(/^-/, '')                  // ltrim hyphen
    .replace(/-$/, '');                 // rtrim hyphen

  // If no repetition, or if the repetition is 0 then ignore. Otherwise append '-' and the number.
  if (repetition) {
    text += '-' + repetition;
  }

  return text;
};

export const getReplaceMethod = (mode: string, repetition?: number, moduleName?: string): ((text: string, repetition?: number) => string) | never => {
  switch (mode) {
    case 'github.com':
      return getGithubId;
    case 'bitbucket.org':
      return getBitbucketId;
    case 'gitlab.com':
      return getGitlabId;
    case 'nodejs.org':
      if (!moduleName) {
        throw new Error('Need module name to generate proper anchor for ' + mode);
      }

      return (hd: string, repetition?: number): string => {
        return getNodejsId(moduleName + '.' + hd, repetition);
      };
    case 'ghost.org':
      return getGhostId;
    default:
      throw new Error('Unknown mode: ' + mode);
  }
};

export const getEncodeUriMethod = (mode: string): ((uri: string) => string) => {
  if (mode === 'github.com') {
    return (uri: string): string => {
      const newURI = encodeURI(uri);

      // encodeURI replaces the zero width joiner character
      // (used to generate emoji sequences, e.g.Female Construction Worker 👷🏼‍♀️)
      // github doesn't URL encode them, so we replace them after url encoding to preserve the zwj character.
      return newURI.replace(/%E2%80%8D/g, '\u200D');
    };
  }

  return encodeURI;
};

export const getUrlHash = (header: string, mode: string, repetition?: number, moduleName?: string): string => {
  const asciiOnlyToLowerCase = (input: string): string => {
    let result = '';
    [...Array(input.length).keys()].forEach(index => {
      if (input[index] >= 'A' && input[index] <= 'Z') {
        result += input[index].toLowerCase();
      } else {
        result += input[index];
      }
    });

    return result;
  };

  return getEncodeUriMethod(mode)(
    getReplaceMethod(mode, repetition, moduleName)(
      asciiOnlyToLowerCase(header.trim()), repetition,
    ),
  );
};

export const anchor = (header: string, mode?: string, repetition?: number, moduleName?: string): string | never => '[' + header + '](#' + getUrlHash(header, mode || 'github.com', repetition, moduleName) + ')';
export default anchor;

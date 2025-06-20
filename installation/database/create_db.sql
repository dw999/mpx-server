DROP DATABASE IF EXISTS mailworkerdb;

CREATE DATABASE mailworkerdb
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

GRANT ALL ON mailworkerdb.* TO 'mwkadmin'@localhost IDENTIFIED BY 'Y4TNfaSbORlQspPj';

USE mailworkerdb;

CREATE OR REPLACE TABLE master_passwd
(
  cur_passwd varchar(256) default '',
  old_passwd varchar(256) default '',
  last_update datetime
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Notes:
-- 1. 'public key' is the Crystals Kyber public key in base64 format
-- 2. 'shared_secret' is the common secret based on the given Crystals Kyber public key in base64 format
-- 3. 'cipher_text' is needed to get back to SMS server, it is also in base64 format
-- 4. Possible values of 'status': 
--    '1' - Receive 'tx_id' and 'public_key' from the SMS server, 
--    '2' - 'cipher_text' and 'shared_secret' has been generated on mail worker side and 'cipher_text' has sent back to SMS server, 
--    '3' - SMS server has acknowledged received 'cipher_text' and 'shared_secret' has been generated successfully in it's side,
--    '4' - Has requested SMS server to send encrypted master password to mail worker,
--    '5' - Encrypted master password has been received, decrypted and updated in mail worker successfully.   
CREATE OR REPLACE TABLE exchg_mp_tx
(
  tx_id varchar(64) default '',
  public_key longtext default '',
  cipher_text longtext default '',
  shared_secret longtext default '',  
  status varchar(2) default '',
  last_update datetime
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
